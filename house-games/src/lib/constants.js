export const PTS = { 1: 3, 2: 2, 3: 1, 4: 0 };
export const MED = { 1: 'Gold', 2: 'Silver', 3: 'Bronze', 4: 'Wood' };
export const MCLS = { 1: 'gold', 2: 'silver', 3: 'bronze', 4: 'wood' };
export const ORD = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };

export const FMTS = { quarter: 'Quarter-finals', semi: 'Semi-finals', final: 'Finals only' };
export const FMTL = {
  quarter: 'Quarter-finals → Semi-finals → Third place → Final',
  semi: 'Semi-finals → Third place → Final',
  final: 'Finals only – select the winners directly',
};
export const FMTN = { quarter: 8, semi: 4, final: 0 };

export const SIGR = ['gamemaster', 'principal'];
export const CLASSES = ['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'];
export const ROLE_LABEL = {
  admin: 'Admin', gamemaster: 'Game master', housemaster: 'House master',
  principal: 'Principal', board: 'Board', student: 'Student',
};

export const RN = {
  Q1: 'Quarter-final 1', Q2: 'Quarter-final 2', Q3: 'Quarter-final 3', Q4: 'Quarter-final 4',
  S1: 'Semi-final 1', S2: 'Semi-final 2', F: 'Final', T: 'Third-place match',
};
export const STAGES = {
  quarter: [['Quarter-finals', ['Q1', 'Q2', 'Q3', 'Q4']], ['Semi-finals', ['S1', 'S2']], ['Third place & Final', ['T', 'F']]],
  semi: [['Semi-finals', ['S1', 'S2']], ['Third place & Final', ['T', 'F']]],
};

/* sheet-style names used throughout the UI -> database table / label / csv hints */
export const CFG = {
  Users: { nm: 'Users', ny: true, hint: 'role (gamemaster/housemaster/student/board/principal), name, email, password (optional – default 12345678)' },
  Years: { nm: 'Competition Years', ny: true },
  Games: { nm: 'Games', hint: 'name, male (yes/no), female (yes/no), maxM, maxF, format (quarter / semi / final – blank = semi) – maxM/maxF = participants per house for each category' },
  Houses: { nm: 'Houses', hint: 'name, color (e.g. #cc0000), masterEmail (house master’s email)' },
  Students: { nm: 'Students', hint: 'name, age, cls, gender (Male/Female), house (house name – house masters may only use their own house)' },
  Entries: { nm: 'Game Entries', hint: 'student (full name), game (game name), category (Male/Female)' },
};
export const COLS = {
  Users: ['role', 'name', 'email', 'signature'],
  Years: ['name', 'active'],
  Games: ['name', 'categories', 'participants', 'format'],
  Houses: ['name', 'color', 'masterEmail'],
  Students: ['name', 'age', 'cls', 'gender', 'houseId'],
  Entries: ['gameId', 'category', 'studentId', 'houseId'],
};
export const HEAD = {
  cls: 'Class', houseId: 'House', gameId: 'Game', studentId: 'Student',
  masterEmail: 'House master', active: 'Active year', format: 'Format',
};
export const TABLE = {   // UI name -> Postgres table
  Users: 'profiles', Years: 'years', Games: 'games', Houses: 'houses', Students: 'students', Entries: 'entries',
};
