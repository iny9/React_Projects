/* Signature cleaning pipeline (runs in the browser).
   1 draw on white · 2 estimate local paper brightness (box blur) · 3 ink strength -> transparency
   4 delete specks, keep soft edges near strokes · 5 recolour, crop, encode PNG, shrink to fit. */
export function sigProcess(img,o){
 var MAXW=560,w0=img.naturalWidth||img.width,h0=img.naturalHeight||img.height;
 if(!w0||!h0)throw new Error('The picture could not be read.');
 var sc=Math.min(1,MAXW/w0),w=Math.max(8,Math.round(w0*sc)),h=Math.max(8,Math.round(h0*sc)),n=w*h,i,x,y,d;
 var cv=document.createElement('canvas');cv.width=w;cv.height=h;var cx=cv.getContext('2d');
 cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(img,0,0,w,h);           /* transparent areas become white paper */
 var p=cx.getImageData(0,0,w,h).data,lum=new Float32Array(n);
 for(i=0;i<n;i++){lum[i]=.299*p[i*4]+.587*p[i*4+1]+.114*p[i*4+2]}
 /* local paper brightness = large box blur (integral image) so shadows and uneven light are ignored */
 var r=Math.max(10,Math.round(Math.min(w,h)/8)),W1=w+1,ii=new Float64Array(W1*(h+1)),bg=new Float32Array(n);
 for(y=0;y<h;y++){var rs=0;for(x=0;x<w;x++){rs+=lum[y*w+x];ii[(y+1)*W1+x+1]=ii[y*W1+x+1]+rs}}
 for(y=0;y<h;y++){var y0=Math.max(0,y-r),y1=Math.min(h,y+r+1);for(x=0;x<w;x++){var x0=Math.max(0,x-r),x1=Math.min(w,x+r+1);bg[y*w+x]=(ii[y1*W1+x1]-ii[y0*W1+x1]-ii[y1*W1+x0]+ii[y0*W1+x0])/((x1-x0)*(y1-y0))}}
 var hist=new Uint32Array(256),acc=0,P=255;for(i=0;i<n;i++)hist[Math.min(255,lum[i]|0)]++;
 for(i=0;i<256;i++){acc+=hist[i];if(acc>=n*.9){P=i;break}}
 var t0=.24-.0017*(o.sens==null?50:o.sens),t1=t0+.2,a=new Float32Array(n);
 for(i=0;i<n;i++){var b=Math.max(bg[i],P*.7,1),k=((b-lum[i])/b-t0)/(t1-t0);a[i]=k<=0?0:k>=1?1:k*k*(3-2*k)}
 /* drop specks: label connected strokes, keep only parts of meaningful size */
 var lab=new Int32Array(n),size=[0],stack=new Int32Array(n);
 for(i=0;i<n;i++){if(a[i]>.3&&!lab[i]){var c=size.length,top=0,cnt=0;stack[top++]=i;lab[i]=c;
  while(top){var q=stack[--top];cnt++;var qx=q%w,qy=(q-qx)/w;for(var dy=-1;dy<=1;dy++){var yy=qy+dy;if(yy<0||yy>=h)continue;for(var dx=-1;dx<=1;dx++){var xx=qx+dx;if(xx<0||xx>=w)continue;var kk=yy*w+xx;if(a[kk]>.3&&!lab[kk]){lab[kk]=c;stack[top++]=kk}}}}
  size.push(cnt)}}
 var big=0;for(i=1;i<size.length;i++)if(size[i]>big)big=size[i];
 if(!big)throw new Error('No signature was found in this picture. Try a clearer photo on plain paper.');
 var thr=Math.max(8,big*.004),keep=new Uint8Array(n),minx=w,miny=h,maxx=-1,maxy=-1;
 for(i=0;i<n;i++){var l=lab[i];if(l&&size[l]>=thr){keep[i]=1;x=i%w;y=(i-x)/w;if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y}}
 var t=new Uint8Array(n),near=new Uint8Array(n);                                   /* keep soft edges only within 2px of kept strokes */
 for(y=0;y<h;y++)for(x=0;x<w;x++)if(keep[y*w+x])for(d=-2;d<=2;d++){var x2=x+d;if(x2>=0&&x2<w)t[y*w+x2]=1}
 for(y=0;y<h;y++)for(x=0;x<w;x++)if(t[y*w+x])for(d=-2;d<=2;d++){var y2=y+d;if(y2>=0&&y2<h)near[y2*w+x]=1}
 var iv=o.ink=='black'?[18,18,22]:[16,32,104],pad=6,ox=Math.max(0,minx-pad),oy=Math.max(0,miny-pad),cw=Math.min(w,maxx+pad+1)-ox,ch=Math.min(h,maxy+pad+1)-oy;
 var out=document.createElement('canvas');out.width=cw;out.height=ch;var oc=out.getContext('2d'),od=oc.createImageData(cw,ch),q2=od.data;
 for(y=0;y<ch;y++)for(x=0;x<cw;x++){var s=(y+oy)*w+x+ox,e=(y*cw+x)*4;q2[e]=iv[0];q2[e+1]=iv[1];q2[e+2]=iv[2];q2[e+3]=near[s]?Math.round(a[s]*255):0}
 oc.putImageData(od,0,0);
 var url=out.toDataURL('image/png'),scl=1;                                         /* shrink until it fits one spreadsheet cell */
 while(url.length>120000&&scl>.3){scl*=.85;var c3=document.createElement('canvas');c3.width=Math.max(20,Math.round(cw*scl));c3.height=Math.max(8,Math.round(ch*scl));c3.getContext('2d').drawImage(out,0,0,c3.width,c3.height);url=c3.toDataURL('image/png')}
 if(url.length>190000)throw new Error('This signature is too detailed to store. Please use a simpler, cleaner picture.');
 return{url:url,w:cw,h:ch}}
