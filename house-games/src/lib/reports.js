/* Reports, certificates and slides – ported unchanged from the working v3 app.
   Everything is drawn in the browser with jsPDF / PptxGenJS (vector shapes, no server needed).
   createReports(ctx) is called with the current data helpers each time it is used. */
import { jsPDF } from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { LOGO } from './logo.js';
import { PTS, MED, ORD, FMTS, SIGR } from './constants.js';

export function createReports(ctx) {
  const { YEAR, CF, yr, byId, nm, standings, sigChosen, cats, gfmt, toast, busy } = ctx;
  function jsp(o){o=o||{};o.unit='mm';o.format='a4';o.compress=true;return new jsPDF(o)}
  function ord(n){return ORD[n]||n+'th'}
  function fileN(s){return s+'_'+nm('Years',YEAR).replace(/[^\w]+/g,'-')}
  function todayStr(){return new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
  function yrCode(){return nm('Years',YEAR).replace(/[^\w]+/g,'-')}

  /* --- drawing toolkit (vector ornaments with jsPDF) --- */
  var C_NAVY=[11,37,92],C_ACC=[37,99,235],C_ACC2=[147,187,240],C_ACCD=[30,64,150],C_IVORY=[247,251,255];
  function gradBg(d,x,y,w,h){var n=48,i,q;for(i=0;i<n;i++){q=i/(n-1);d.setFillColor(Math.round(255-49*q),Math.round(255-29*q),255);d.rect(x,y+h*i/n,w,h/n+.35,'F')}}
  var SEAL={0:[[196,222,255],[37,99,235]],1:[[240,208,96],[170,134,30]],2:[[222,226,232],[126,132,142]],3:[[222,156,92],[132,80,28]],4:[[190,144,92],[100,66,32]]};
  function fc(d,c){d.setFillColor(c[0],c[1],c[2])}function dc(d,c){d.setDrawColor(c[0],c[1],c[2])}function tc(d,c){d.setTextColor(c[0],c[1],c[2])}
  function arcPts(cx,cy,r,a0,a1,n){var a=[];for(var i=0;i<=n;i++){var t=(a0+(a1-a0)*i/n)*Math.PI/180;a.push([cx+r*Math.cos(t),cy+r*Math.sin(t)])}return a}
  function poly(d,p,style,closed){var v=[];for(var i=1;i<p.length;i++)v.push([p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]]);d.lines(v,p[0][0],p[0][1],[1,1],style||'S',!!closed)}
  function diamond(d,x,y,s){poly(d,[[x,y-s],[x+s,y],[x,y+s],[x-s,y]],'F',true)}
  function star(d,x,y,R,r){var p=[];for(var i=0;i<10;i++){var a=(-90+i*36)*Math.PI/180,q=i%2?r:R;p.push([x+q*Math.cos(a),y+q*Math.sin(a)])}poly(d,p,'F',true)}
  function lsText(d,t,x,y,cs){var n=t.length,ws=[],w=0,i;for(i=0;i<n;i++){ws.push(d.getTextWidth(t.charAt(i)));w+=ws[i]}w+=cs*(n-1);var px=x-w/2;for(i=0;i<n;i++){d.text(t.charAt(i),px,y);px+=ws[i]+cs}}
  function divider(d,cx,y,half){dc(d,C_ACC);d.setLineWidth(.45);d.line(cx-half,y,cx-6.5,y);d.line(cx+6.5,y,cx+half,y);fc(d,C_ACC);diamond(d,cx,y,2.4);diamond(d,cx-half-2.2,y,1.1);diamond(d,cx+half+2.2,y,1.1);fc(d,C_NAVY);d.circle(cx-4.6,y,.65,'F');d.circle(cx+4.6,y,.65,'F')}
  /** Ornate frame: navy band with gold pin-lines, double gold border, guilloche waves, corner rosettes and fans. Works for any page size. */
  function frame(d,W,H){
   fc(d,C_IVORY);d.rect(0,0,W,H,'F');
   fc(d,C_NAVY);d.rect(4,4,W-8,H-8,'F');gradBg(d,10.5,10.5,W-21,H-21);
   dc(d,C_ACC2);d.setLineWidth(.3);d.rect(6,6,W-12,H-12,'S');d.rect(8.6,8.6,W-17.2,H-17.2,'S');
   dc(d,C_ACC);d.setLineWidth(1);d.rect(13,13,W-26,H-26,'S');d.setLineWidth(.25);d.rect(14.6,14.6,W-29.2,H-29.2,'S');
   /* guilloche: two interlaced sine waves along every side */
   d.setLineWidth(.17);dc(d,C_ACC2);
   var L=7,A=2.7,c0=19.8,s=.5,i,k,p1,p2,x,y;
   for(k=0;k<2;k++){var ph=k?Math.PI:0;
    p1=[];p2=[];for(x=28;x<=W-28;x+=s){var yy=A*Math.sin(2*Math.PI*(x-28)/L+ph);p1.push([x,c0+yy]);p2.push([x,H-c0-yy])}poly(d,p1,'S');poly(d,p2,'S');
    p1=[];p2=[];for(y=28;y<=H-28;y+=s){var xx=A*Math.sin(2*Math.PI*(y-28)/L+ph);p1.push([c0+xx,y]);p2.push([W-c0-xx,y])}poly(d,p1,'S');poly(d,p2,'S')}
   dc(d,C_ACC);d.setLineWidth(.25);d.rect(24.6,24.6,W-49.2,H-49.2,'S');
   [[20,20,1,1],[W-20,20,-1,1],[20,H-20,1,-1],[W-20,H-20,-1,-1]].forEach(function(c){
    fc(d,C_NAVY);d.circle(c[0],c[1],5.6,'F');fc(d,C_ACC);d.circle(c[0],c[1],4.6,'F');fc(d,C_NAVY);d.circle(c[0],c[1],3.6,'F');fc(d,C_ACC2);star(d,c[0],c[1],3,1.25);
    var ax=c[0]+c[2]*4.6,ay=c[1]+c[3]*4.6;dc(d,C_ACC);d.setLineWidth(.3);
    [4,6.5,9].forEach(function(r){var a0=c[2]>0?(c[3]>0?0:270):(c[3]>0?90:180);poly(d,arcPts(ax,ay,r,a0,a0+90,14),'S')})})}
  function seal(d,cx,cy,pos){
   var c=SEAL[pos]||SEAL[4],i;
   fc(d,C_NAVY);dc(d,C_ACC);d.setLineWidth(.35);
   poly(d,[[cx-9,cy+6],[cx-1,cy+9],[cx-5,cy+23],[cx-8.8,cy+19.6],[cx-13.4,cy+22]],'FD',true);
   poly(d,[[cx+9,cy+6],[cx+1,cy+9],[cx+5,cy+23],[cx+8.8,cy+19.6],[cx+13.4,cy+22]],'FD',true);
   fc(d,C_ACC);for(i=0;i<24;i++){var a=i*15*Math.PI/180;d.circle(cx+11.2*Math.cos(a),cy+11.2*Math.sin(a),1.9,'F')}
   d.circle(cx,cy,11.2,'F');dc(d,C_ACCD);d.setLineWidth(.3);d.circle(cx,cy,10,'S');
   fc(d,c[1]);d.circle(cx,cy,9,'F');fc(d,c[0]);d.circle(cx,cy,7.6,'F');dc(d,C_ACCD);d.setLineWidth(.25);d.circle(cx,cy,7.6,'S');d.circle(cx,cy,6.6,'S');
   if(pos==0){fc(d,C_NAVY);star(d,cx,cy,6,2.5)}else{tc(d,pos==4?[255,255,255]:[48,34,8]);d.setFont('times','bold');d.setFontSize(15);d.text(ord(pos),cx,cy+2.2,{align:'center'})}}
  /** One landscape certificate. o = {name,pos,lines,kind,no};  sg = {gamemaster:{name,data,w,h},principal:{...}} */
  function cert(d,o,sg){
   var W=297,H=210,cx=W/2;sg=sg||{};frame(d,W,H);
   d.saveGraphicsState();d.setGState(new d.GState({opacity:.06}));d.addImage(LOGO,'PNG',cx-55,H/2-53.4,110,106.8);d.restoreGraphicsState();
   fc(d,C_ACC);d.circle(cx,39,12.6,'F');fc(d,C_IVORY);d.circle(cx,39,11.4,'F');d.addImage(LOGO,'PNG',cx-9.5,39-9.2,19,18.45);dc(d,C_NAVY);d.setLineWidth(.4);d.circle(cx,39,13.6,'S');
   dc(d,C_ACC);d.setLineWidth(.45);d.line(cx-86,39,cx-18,39);d.line(cx+18,39,cx+86,39);fc(d,C_ACC);diamond(d,cx-16,39,1.6);diamond(d,cx+16,39,1.6);diamond(d,cx-89,39,1.4);diamond(d,cx+89,39,1.4);
   tc(d,C_NAVY);d.setFont('times','bold');d.setFontSize(34);lsText(d,'CERTIFICATE',cx,64,2.2);
   tc(d,C_ACCD);d.setFont('times','normal');d.setFontSize(13);lsText(d,o.kind||'OF ACHIEVEMENT',cx,72,1.9);
   divider(d,cx,77,38);
   d.setFont('times','italic');d.setFontSize(10.5);tc(d,[70,88,120]);d.text('Baptist Academy Jimeta Yola · Inter-House Games '+nm('Years',YEAR),cx,84,{align:'center'});
   d.setFontSize(12);d.text('This certificate is proudly presented to',cx,93,{align:'center'});
   var fs=o.name.length<=22?34:o.name.length<=30?28:o.name.length<=40?23:19;d.setFont('times','bolditalic');d.setFontSize(fs);while(d.getTextWidth(o.name)>225&&fs>12){fs-=1;d.setFontSize(fs)}
   tc(d,C_NAVY);d.text(o.name,cx,107,{align:'center'});
   dc(d,C_ACC);d.setLineWidth(.6);d.line(cx-78,111,cx+78,111);fc(d,C_ACC);diamond(d,cx,111,1.8);
   d.setFont('times','normal');d.setFontSize(12.5);tc(d,[28,44,78]);var y=121;
   o.lines.forEach(function(t){d.splitTextToSize(t,215).forEach(function(p){d.text(p,cx,y,{align:'center'});y+=7})});
   seal(d,cx,157,o.pos);
   [[cx-83,'gamemaster','Game Master'],[cx+83,'principal','Principal']].forEach(function(b){
    var s=sg[b[1]],ly=167;
    if(s){var k=Math.min(56/s.w,22/s.h),w=s.w*k,h=s.h*k;d.addImage(s.data,'PNG',b[0]-w/2,ly-h+1.2,w,h)}
    dc(d,C_NAVY);d.setLineWidth(.35);d.line(b[0]-31,ly,b[0]+31,ly);
    if(s){tc(d,C_NAVY);d.setFont('times','bold');d.setFontSize(10.5);d.text(s.name,b[0],ly+5,{align:'center'})}
    tc(d,C_ACCD);d.setFont('times','italic');d.setFontSize(9.5);d.text(b[2],b[0],ly+(s?9.6:5),{align:'center'})});
   d.setFont('times','normal');d.setFontSize(7.5);tc(d,[100,116,146]);d.text('Certificate No. '+(o.no||'—'),38,181.5);d.text('Issued '+todayStr(),W-38,181.5,{align:'right'})}
  function loadImg(src){return new Promise(function(res){var i=new Image();i.onload=function(){res(i)};i.onerror=function(){res(null)};i.src=src})}
  async function sigAssets(){var o={};for(var k=0;k<SIGR.length;k++){var s=sigChosen(SIGR[k]);if(s){var im=await loadImg(s.data);if(im&&im.naturalWidth)o[SIGR[k]]={name:s.name,data:s.data,w:im.naturalWidth,h:im.naturalHeight}}}return o}
  async function houseCerts(){var st=standings({});if(!st.length)return toast('No houses yet.',1);var sg=await sigAssets(),d=jsp({orientation:'landscape'});
   st.forEach(function(x,i){if(i)d.addPage();var m=Math.min(x.rank,4);cert(d,{kind:'OF EXCELLENCE',name:x.h.name,pos:m,no:'HGC-'+yrCode()+'-H'+(i+1),lines:['for achieving '+ord(x.rank)+' position in the overall Inter-House Games Championship','with a total of '+x.pts+' points','Medals won: Gold '+x.g+' · Silver '+x.s+' · Bronze '+x.b+' · Wood '+x.w]},sg)});
   d.save(fileN('House-Certificates')+'.pdf')}
  function entStudents(gid,cat,hid){return yr('Entries').filter(function(e){return e.gameId==gid&&e.category==cat&&e.houseId==hid}).map(function(e){return byId('Students',e.studentId)}).filter(Boolean).sort(function(a,b){return String(a.name).localeCompare(String(b.name))})}
  /** One row per certificate: every student entered for a medal-winning house gets a personal certificate (a house certificate only if nobody was entered). */
  function certRows(f){
    var out=[],gm=function(id){return nm('Games',id)};
    var rs=yr('Results').filter(function(r){return r.pos>=1&&r.pos<=4&&(!f.game||r.gameId==f.game)&&(!f.house||r.houseId==f.house)&&byId('Games',r.gameId)&&byId('Houses',r.houseId)});
    rs.sort(function(a,b){return gm(a.gameId).localeCompare(gm(b.gameId))||a.category.localeCompare(b.category)||a.pos-b.pos||nm('Houses',a.houseId).localeCompare(nm('Houses',b.houseId))});
    rs.forEach(function(r){var ss=entStudents(r.gameId,r.category,r.houseId);if(ss.length)ss.forEach(function(s){out.push({s:s,r:r,n:ss.length})});else out.push({s:null,r:r,n:0})});
    if(f.part){
      var won={};yr('Results').forEach(function(r){if(r.pos>=1&&r.pos<=4)won[r.gameId+'|'+r.category+'|'+r.houseId]=1});
      var es=yr('Entries').filter(function(e){return(!f.game||e.gameId==f.game)&&(!f.house||e.houseId==f.house)&&!won[e.gameId+'|'+e.category+'|'+e.houseId]&&byId('Games',e.gameId)&&byId('Students',e.studentId)});
      es.sort(function(a,b){return gm(a.gameId).localeCompare(gm(b.gameId))||a.category.localeCompare(b.category)||nm('Houses',a.houseId).localeCompare(nm('Houses',b.houseId))||nm('Students',a.studentId).localeCompare(nm('Students',b.studentId))});
      es.forEach(function(e){out.push({s:byId('Students',e.studentId),r:{gameId:e.gameId,category:e.category,houseId:e.houseId,pos:0},n:0})})}
    return out}
  async function gameCerts(){
    var rows=certRows(CF);if(!rows.length)return toast(CF.part?'No entries or results match these options.':'No medal results (or entries) match these options yet.',1);
    busy(true);await new Promise(function(r){setTimeout(r,40)});
    try{
     var sg=await sigAssets(),d=jsp({orientation:'landscape'});
     rows.forEach(function(x,i){
      if(i)d.addPage();
      var r=x.r,p=+r.pos,g=nm('Games',r.gameId),hn=nm('Houses',r.houseId),no='HGC-'+yrCode()+'-'+('000'+(i+1)).slice(-3);
      var who=x.s?'Class: '+(x.s.cls||'—')+' · House: '+hn:'';
      if(!p)cert(d,{kind:'OF PARTICIPATION',name:x.s.name,pos:0,no:no,lines:[who,'for taking part in',g+' – '+r.category+' category']},sg);
      else if(x.s&&x.n==1)cert(d,{name:x.s.name,pos:p,no:no,lines:[who,g+' ('+r.category+') – '+ord(p)+' place · '+MED[p]+' medal','Points earned: '+PTS[p]]},sg);
      else if(x.s)cert(d,{name:x.s.name,pos:p,no:no,lines:[who,'as a member of the team that won the '+MED[p]+' medal ('+ord(p)+' place) in',g+' – '+r.category+' category','House points earned: '+PTS[p]]},sg);
      else cert(d,{name:hn,pos:p,no:no,lines:['for winning the '+MED[p]+' medal ('+ord(p)+' place) in',g+' – '+r.category+' category','Points earned: '+PTS[p]]},sg)});
     d.save(fileN('Game-Certificates')+'.pdf');toast(rows.length+' certificate'+(rows.length==1?'':'s')+' created.')
    }catch(e){toast('Could not create the certificates: '+(e.message||e),1)}finally{busy(false)}}

  async function certPreview(){var sg=await sigAssets(),d=jsp({orientation:'landscape'}),st=standings({}),x=st[0];
   cert(d,{name:x?x.h.name:'Sample House',pos:1,no:'SAMPLE',lines:['for winning the Gold medal (1st place) in','100m Sprint – Male category','Points earned: 3']},sg);d.save(fileN('Certificate-Preview')+'.pdf')}

  /* --- full report: LIGHT cover page, then standings and results --- */
  function pdfReport(){
   var d=jsp(),st=standings({}),y=0,W=210,H=297;
   frame(d,W,H);
   d.addImage(LOGO,'PNG',W/2-34,46,68,66);
   tc(d,C_NAVY);d.setFont('times','bold');d.setFontSize(30);lsText(d,'HOUSE GAMES',W/2,135,2.4);lsText(d,'CHAMPIONSHIP',W/2,148,2.4);
   divider(d,W/2,157,45);
   d.setFont('times','bold');d.setFontSize(18);tc(d,C_ACCD);d.text(nm('Years',YEAR),W/2,170,{align:'center'});
   d.setFont('times','italic');d.setFontSize(12);tc(d,[70,88,120]);d.text('Official Competition Report',W/2,180,{align:'center'});d.text('Baptist Academy Jimeta Yola · Strive for Excellence',W/2,187,{align:'center'});
   if(st.length&&st[0].pts>0){d.setFont('times','normal');d.setFontSize(10);tc(d,C_ACCD);lsText(d,'OVERALL CHAMPION',W/2,208,1.6);d.setFont('times','bold');d.setFontSize(20);tc(d,C_NAVY);d.text(st[0].h.name,W/2,218,{align:'center'});d.setFont('times','italic');d.setFontSize(11);tc(d,[70,88,120]);d.text(st[0].pts+' points',W/2,225,{align:'center'})}
   d.setFont('times','normal');d.setFontSize(9);tc(d,[100,116,146]);d.text('Issued '+todayStr(),W/2,238,{align:'center'});
   function page(t){d.addPage();y=22;d.setTextColor(30,64,150);d.setFont('times','bold');d.setFontSize(16);d.text(t,14,y);y+=4;d.setDrawColor(37,99,235);d.setLineWidth(.4);d.line(14,y,W-14,y);y+=8;d.setTextColor(30,30,30)}
   function ln(a,b){if(y>278){page('(continued)')}d.setFont('times','normal');d.setFontSize(10.5);d.text(a,14,y);if(b)d.text(b,W-14,y,{align:'right'});y+=6.5}
   page('Overall standings');
   var X=[118,136,154,172,196];d.setFont('times','bold');d.setFontSize(10.5);d.text('Pos',14,y);d.text('House',26,y);['Gold','Silver','Bronze','Wood','Points'].forEach(function(t,i){d.text(t,X[i],y,{align:'right'})});y+=7;
   st.forEach(function(x,i){if(y>278)page('Overall standings (continued)');if(i%2==0){d.setFillColor(234,242,254);d.rect(12,y-4.8,W-24,7,'F')}d.setFont('times','normal');d.setFontSize(10.5);d.setTextColor(30,30,30);d.text(String(x.rank),14,y);d.text(x.h.name,26,y);[x.g,x.s,x.b,x.w,x.pts].forEach(function(v,j){d.text(String(v),X[j],y,{align:'right'})});y+=7});
   page('Results by game');
   yr('Games').forEach(function(g){cats(g).forEach(function(c){var p={};yr('Results').filter(function(r){return r.gameId==g.id&&r.category==c[0]}).forEach(function(r){p[r.pos]=r.houseId});if(y>248)page('Results by game (continued)');d.setFont('times','bold');d.setFontSize(11.5);d.text(g.name+' – '+c[0]+' · '+FMTS[gfmt(g)],14,y);y+=6.5;
    [1,2,3,4].forEach(function(i){ln(ord(i)+' · '+MED[i]+' ('+PTS[i]+' pts)',p[i]?nm('Houses',p[i]):'—')});y+=3})});
   d.save(fileN('House-Games-Report')+'.pdf')}
  function pptReport(){
   var p=new PptxGenJS(),st=standings({}),lg=LOGO.replace('data:',''),BG='F2F7FF',GD='1D4ED8',TX='0B1F4D';p.layout='LAYOUT_WIDE';
   function sl(t){var s=p.addSlide();s.background={color:BG};s.addText(t,{x:.5,y:.3,w:9,h:.7,fontSize:26,bold:true,color:GD,fontFace:'Georgia'});s.addImage({data:lg,x:11.7,y:.2,w:.95,h:.92});return s}
   var s=p.addSlide();s.background={color:BG};s.addImage({data:lg,x:5.3,y:.7,w:2.7,h:2.62});s.addText('HOUSE GAMES CHAMPIONSHIP',{x:.5,y:3.6,w:12.3,h:.9,align:'center',fontSize:38,bold:true,color:GD,fontFace:'Georgia'});s.addText(nm('Years',YEAR)+' · Baptist Academy Jimeta Yola',{x:.5,y:4.6,w:12.3,h:.6,align:'center',fontSize:20,color:TX});
   s=sl('Overall standings');var hd=['Pos','House','Gold','Silver','Bronze','Wood','Points'].map(function(t){return{text:t,options:{bold:true,color:'FFFFFF',fill:{color:GD}}}});
   s.addTable([hd].concat(st.map(function(x){return [x.rank,x.h.name,x.g,x.s,x.b,x.w,x.pts].map(function(v){return{text:String(v),options:{color:TX,fill:{color:'E3EEFF'}}}})})),{x:.8,y:1.4,w:11.7,fontSize:18,border:{type:'solid',color:'9DBCEB',pt:.5}});
   yr('Games').forEach(function(g){cats(g).forEach(function(c){var pp={};yr('Results').filter(function(r){return r.gameId==g.id&&r.category==c[0]}).forEach(function(r){pp[r.pos]=r.houseId});var s2=sl(g.name+' · '+c[0]);
    s2.addTable([[{text:'Position',options:{bold:true,color:'FFFFFF',fill:{color:GD}}},{text:'House',options:{bold:true,color:'FFFFFF',fill:{color:GD}}},{text:'Points',options:{bold:true,color:'FFFFFF',fill:{color:GD}}}]].concat([1,2,3,4].map(function(i){return [ord(i)+' – '+MED[i],pp[i]?nm('Houses',pp[i]):'—',String(PTS[i])].map(function(v){return{text:v,options:{color:TX,fill:{color:'E3EEFF'}}}})})),{x:1.5,y:1.5,w:10,fontSize:20,border:{type:'solid',color:'9DBCEB',pt:.5}})})});
   p.writeFile({fileName:fileN('House-Games-Slides')+'.pptx'})}

  return { certRows, houseCerts, gameCerts, certPreview, pdfReport, pptReport };
}
