// Fixture oficial Primera Nacional 2026 (cruces). Resultados ignorados.
// Cada item: [round, homeId, awayId]
export type RawMatch = [number, string, string];

export const FIXTURE_2026: RawMatch[] = [
  // ===== Fecha 1 =====
  [1,"sanmiguel","centralnorte"],[1,"rafaela","almagro"],[1,"godoycruz","ciudadbolivar"],
  [1,"gimnasiatiro","colegiales"],[1,"acassuso","chacoforever"],[1,"allboys","mitre"],
  [1,"depmoron","defbelgrano"],[1,"santelmo","ferro"],[1,"agropecuario","depmaipu"],
  [1,"tristanrey","temperley"],[1,"colon","depmadryn"],[1,"chacarita","sanmartinsj"],
  [1,"guemes","nuevachicago"],[1,"losandes","almirantebrown"],[1,"racingcba","estudiantesba"],
  [1,"sanmartint","patronato"],[1,"atlanta","quilmes"],[1,"gimnasiajujuy","midland"],

  // ===== Fecha 2 =====
  [2,"acassuso","racingcba"],[2,"almagro","sanmartint"],[2,"nuevachicago","tristanrey"],
  [2,"ferro","sanmiguel"],[2,"depmadryn","depmoron"],[2,"depmaipu","rafaela"],
  [2,"patronato","gimnasiatiro"],[2,"quilmes","midland"],[2,"sanmartinsj","guemes"],
  [2,"chacoforever","santelmo"],[2,"defbelgrano","godoycruz"],[2,"almirantebrown","allboys"],
  [2,"ciudadbolivar","losandes"],[2,"chacarita","gimnasiajujuy"],[2,"centralnorte","colon"],
  [2,"colegiales","atlanta"],[2,"mitre","estudiantesba"],

  // ===== Fecha 3 =====
  [3,"gimnasiatiro","almagro"],[3,"losandes","defbelgrano"],[3,"sanmiguel","chacoforever"],
  [3,"colon","ferro"],[3,"agropecuario","nuevachicago"],[3,"allboys","ciudadbolivar"],
  [3,"godoycruz","depmadryn"],[3,"depmoron","centralnorte"],[3,"santelmo","acassuso"],
  [3,"gimnasiajujuy","quilmes"],[3,"midland","colegiales"],[3,"guemes","chacarita"],
  [3,"sanmartint","depmaipu"],[3,"racingcba","mitre"],[3,"estudiantesba","almirantebrown"],
  [3,"rafaela","temperley"],[3,"tristanrey","sanmartinsj"],[3,"atlanta","patronato"],

  // ===== Fecha 4 =====
  [4,"santelmo","racingcba"],[4,"acassuso","sanmiguel"],[4,"chacoforever","colon"],
  [4,"ferro","depmoron"],[4,"centralnorte","godoycruz"],[4,"depmadryn","losandes"],
  [4,"defbelgrano","allboys"],[4,"ciudadbolivar","estudiantesba"],[4,"almirantebrown","mitre"],
  [4,"guemes","gimnasiajujuy"],[4,"chacarita","tristanrey"],[4,"sanmartinsj","agropecuario"],
  [4,"nuevachicago","rafaela"],[4,"temperley","sanmartint"],[4,"depmaipu","gimnasiatiro"],
  [4,"almagro","atlanta"],[4,"patronato","midland"],[4,"colegiales","quilmes"],

  // ===== Fecha 5 =====
  [5,"racingcba","almirantebrown"],[5,"rafaela","sanmartinsj"],[5,"losandes","centralnorte"],
  [5,"estudiantesba","defbelgrano"],[5,"allboys","depmadryn"],[5,"depmoron","chacoforever"],
  [5,"sanmiguel","santelmo"],[5,"godoycruz","ferro"],[5,"tristanrey","guemes"],
  [5,"quilmes","patronato"],[5,"colon","acassuso"],[5,"midland","almagro"],
  [5,"gimnasiatiro","temperley"],[5,"agropecuario","chacarita"],[5,"mitre","ciudadbolivar"],
  [5,"gimnasiajujuy","colegiales"],[5,"sanmartint","nuevachicago"],[5,"atlanta","depmaipu"],

  // ===== Fecha 6 =====
  [6,"sanmartinsj","sanmartint"],[6,"almagro","quilmes"],[6,"sanmiguel","racingcba"],
  [6,"acassuso","depmoron"],[6,"defbelgrano","mitre"],[6,"ciudadbolivar","almirantebrown"],
  [6,"depmadryn","estudiantesba"],[6,"ferro","losandes"],[6,"tristanrey","gimnasiajujuy"],
  [6,"chacoforever","godoycruz"],[6,"santelmo","colon"],[6,"chacarita","rafaela"],
  [6,"temperley","atlanta"],[6,"patronato","colegiales"],[6,"centralnorte","allboys"],
  [6,"guemes","agropecuario"],[6,"depmaipu","midland"],[6,"nuevachicago","gimnasiatiro"],

  // ===== Fecha 7 (interzonal/clásicos) =====
  [7,"atlanta","ferro"],[7,"almagro","depmoron"],[7,"almirantebrown","tristanrey"],
  [7,"colegiales","sanmiguel"],[7,"losandes","temperley"],[7,"nuevachicago","allboys"],
  [7,"chacarita","estudiantesba"],[7,"depmadryn","sanmartint"],[7,"patronato","colon"],
  [7,"santelmo","quilmes"],[7,"depmaipu","godoycruz"],[7,"guemes","mitre"],
  [7,"gimnasiatiro","centralnorte"],[7,"defbelgrano","rafaela"],[7,"midland","acassuso"],

  // ===== Fecha 8 =====
  [8,"gimnasiatiro","sanmartinsj"],[8,"allboys","ferro"],[8,"agropecuario","tristanrey"],
  [8,"colegiales","almagro"],[8,"estudiantesba","centralnorte"],[8,"midland","temperley"],
  [8,"godoycruz","acassuso"],[8,"sanmartint","chacarita"],[8,"colon","sanmiguel"],
  [8,"losandes","chacoforever"],[8,"almirantebrown","defbelgrano"],[8,"depmoron","santelmo"],
  [8,"gimnasiajujuy","patronato"],[8,"quilmes","depmaipu"],[8,"racingcba","ciudadbolivar"],
  [8,"mitre","depmadryn"],[8,"rafaela","guemes"],[8,"atlanta","nuevachicago"],

  // ===== Fecha 9 =====
  [9,"sanmiguel","depmoron"],[9,"santelmo","godoycruz"],[9,"almagro","patronato"],
  [9,"colon","racingcba"],[9,"acassuso","losandes"],[9,"chacoforever","allboys"],
  [9,"ferro","estudiantesba"],[9,"centralnorte","mitre"],[9,"depmadryn","almirantebrown"],
  [9,"defbelgrano","ciudadbolivar"],[9,"agropecuario","gimnasiajujuy"],[9,"guemes","sanmartint"],
  [9,"chacarita","gimnasiatiro"],[9,"temperley","quilmes"],[9,"depmaipu","colegiales"],
  [9,"nuevachicago","midland"],[9,"tristanrey","rafaela"],[9,"sanmartinsj","atlanta"],

  // ===== Fecha 10 =====
  [10,"losandes","santelmo"],[10,"midland","sanmartinsj"],[10,"allboys","acassuso"],
  [10,"depmoron","colon"],[10,"godoycruz","sanmiguel"],[10,"quilmes","nuevachicago"],
  [10,"ciudadbolivar","depmadryn"],[10,"patronato","depmaipu"],[10,"racingcba","defbelgrano"],
  [10,"almirantebrown","centralnorte"],[10,"mitre","ferro"],[10,"estudiantesba","chacoforever"],
  [10,"gimnasiajujuy","almagro"],[10,"colegiales","temperley"],[10,"gimnasiatiro","guemes"],
  [10,"sanmartint","tristanrey"],[10,"rafaela","agropecuario"],[10,"atlanta","chacarita"],

  // ===== Fecha 11 =====
  [11,"sanmiguel","losandes"],[11,"santelmo","allboys"],[11,"temperley","patronato"],
  [11,"sanmartinsj","quilmes"],[11,"rafaela","gimnasiajujuy"],[11,"depmoron","racingcba"],
  [11,"tristanrey","gimnasiatiro"],[11,"nuevachicago","colegiales"],[11,"acassuso","estudiantesba"],
  [11,"chacarita","midland"],[11,"depmadryn","defbelgrano"],[11,"agropecuario","sanmartint"],
  [11,"chacoforever","mitre"],[11,"centralnorte","ciudadbolivar"],[11,"guemes","atlanta"],
  [11,"depmaipu","almagro"],[11,"colon","godoycruz"],[11,"ferro","almirantebrown"],

  // ===== Fecha 12 =====
  [12,"allboys","sanmiguel"],[12,"losandes","colon"],[12,"sanmartint","rafaela"],
  [12,"defbelgrano","centralnorte"],[12,"estudiantesba","santelmo"],[12,"colegiales","sanmartinsj"],
  [12,"atlanta","tristanrey"],[12,"mitre","acassuso"],[12,"almagro","temperley"],
  [12,"gimnasiajujuy","depmaipu"],[12,"almirantebrown","chacoforever"],[12,"patronato","nuevachicago"],
  [12,"ciudadbolivar","ferro"],[12,"midland","guemes"],[12,"godoycruz","depmoron"],
  [12,"racingcba","depmadryn"],[12,"quilmes","chacarita"],[12,"gimnasiatiro","agropecuario"],

  // ===== Fecha 13 =====
  [13,"depmoron","losandes"],[13,"santelmo","mitre"],[13,"sanmiguel","estudiantesba"],
  [13,"tristanrey","midland"],[13,"temperley","depmaipu"],[13,"sanmartinsj","patronato"],
  [13,"rafaela","gimnasiatiro"],[13,"acassuso","almirantebrown"],[13,"godoycruz","racingcba"],
  [13,"chacoforever","ciudadbolivar"],[13,"centralnorte","depmadryn"],[13,"colon","allboys"],
  [13,"chacarita","colegiales"],[13,"guemes","quilmes"],[13,"agropecuario","atlanta"],
  [13,"ferro","defbelgrano"],[13,"nuevachicago","almagro"],[13,"sanmartint","gimnasiajujuy"],

  // ===== Fecha 14 =====
  [14,"racingcba","centralnorte"],[14,"depmadryn","ferro"],[14,"defbelgrano","chacoforever"],
  [14,"ciudadbolivar","acassuso"],[14,"almirantebrown","santelmo"],[14,"mitre","sanmiguel"],
  [14,"estudiantesba","colon"],[14,"allboys","depmoron"],[14,"losandes","godoycruz"],
  [14,"gimnasiajujuy","temperley"],[14,"depmaipu","nuevachicago"],[14,"almagro","sanmartinsj"],
  [14,"patronato","chacarita"],[14,"colegiales","guemes"],[14,"quilmes","tristanrey"],
  [14,"midland","agropecuario"],[14,"atlanta","rafaela"],[14,"gimnasiatiro","sanmartint"],

  // ===== Fecha 15 =====
  [15,"losandes","racingcba"],[15,"godoycruz","allboys"],[15,"depmoron","estudiantesba"],
  [15,"colon","mitre"],[15,"sanmiguel","almirantebrown"],[15,"santelmo","ciudadbolivar"],
  [15,"acassuso","defbelgrano"],[15,"chacoforever","depmadryn"],[15,"ferro","centralnorte"],
  [15,"gimnasiatiro","gimnasiajujuy"],[15,"sanmartint","atlanta"],[15,"rafaela","midland"],
  [15,"agropecuario","quilmes"],[15,"tristanrey","colegiales"],[15,"guemes","patronato"],
  [15,"chacarita","almagro"],[15,"sanmartinsj","depmaipu"],[15,"nuevachicago","temperley"],

  // ===== Fecha 16 =====
  [16,"racingcba","ferro"],[16,"centralnorte","chacoforever"],[16,"depmadryn","acassuso"],
  [16,"defbelgrano","santelmo"],[16,"ciudadbolivar","sanmiguel"],[16,"almirantebrown","colon"],
  [16,"mitre","depmoron"],[16,"estudiantesba","godoycruz"],[16,"allboys","losandes"],
  [16,"gimnasiajujuy","nuevachicago"],[16,"temperley","sanmartinsj"],[16,"depmaipu","chacarita"],
  [16,"almagro","guemes"],[16,"patronato","tristanrey"],[16,"colegiales","agropecuario"],
  [16,"quilmes","rafaela"],[16,"midland","sanmartint"],[16,"atlanta","gimnasiatiro"],

  // ===== Fecha 17 =====
  [17,"allboys","racingcba"],[17,"losandes","estudiantesba"],[17,"godoycruz","mitre"],
  [17,"depmoron","almirantebrown"],[17,"colon","ciudadbolivar"],[17,"sanmiguel","defbelgrano"],
  [17,"santelmo","depmadryn"],[17,"acassuso","centralnorte"],[17,"chacoforever","ferro"],
  [17,"atlanta","gimnasiajujuy"],[17,"gimnasiatiro","midland"],[17,"sanmartint","quilmes"],
  [17,"rafaela","colegiales"],[17,"agropecuario","patronato"],[17,"tristanrey","almagro"],
  [17,"guemes","depmaipu"],[17,"chacarita","temperley"],[17,"sanmartinsj","nuevachicago"],

  // ===== Fecha 18 =====
  [18,"racingcba","chacoforever"],[18,"ferro","acassuso"],[18,"centralnorte","santelmo"],
  [18,"depmadryn","sanmiguel"],[18,"defbelgrano","colon"],[18,"ciudadbolivar","depmoron"],
  [18,"almirantebrown","godoycruz"],[18,"mitre","losandes"],[18,"estudiantesba","allboys"],
  [18,"gimnasiajujuy","sanmartinsj"],[18,"nuevachicago","chacarita"],[18,"temperley","guemes"],
  [18,"depmaipu","tristanrey"],[18,"almagro","agropecuario"],[18,"patronato","rafaela"],
  [18,"colegiales","sanmartint"],[18,"quilmes","gimnasiatiro"],

  // ===== Fecha 19 =====
  [19,"estudiantesba","racingcba"],[19,"mitre","allboys"],[19,"almirantebrown","losandes"],
  [19,"ciudadbolivar","godoycruz"],[19,"defbelgrano","depmoron"],[19,"depmadryn","colon"],
  [19,"centralnorte","sanmiguel"],[19,"ferro","santelmo"],[19,"chacoforever","acassuso"],
  [19,"midland","gimnasiajujuy"],[19,"quilmes","atlanta"],[19,"colegiales","gimnasiatiro"],
  [19,"patronato","sanmartint"],[19,"almagro","rafaela"],[19,"depmaipu","agropecuario"],
  [19,"temperley","tristanrey"],[19,"nuevachicago","guemes"],[19,"sanmartinsj","chacarita"],

  // ===== Fecha 20 =====
  [20,"racingcba","acassuso"],[20,"santelmo","chacoforever"],[20,"sanmiguel","ferro"],
  [20,"colon","centralnorte"],[20,"depmoron","depmadryn"],[20,"godoycruz","defbelgrano"],
  [20,"losandes","ciudadbolivar"],[20,"allboys","almirantebrown"],[20,"estudiantesba","mitre"],
  [20,"gimnasiajujuy","chacarita"],[20,"guemes","sanmartinsj"],[20,"tristanrey","nuevachicago"],
  [20,"agropecuario","temperley"],[20,"rafaela","depmaipu"],[20,"sanmartint","almagro"],
  [20,"gimnasiatiro","patronato"],[20,"atlanta","colegiales"],[20,"midland","quilmes"],

  // ===== Fecha 21 =====
  [21,"mitre","racingcba"],[21,"almirantebrown","estudiantesba"],[21,"ciudadbolivar","allboys"],
  [21,"defbelgrano","losandes"],[21,"depmadryn","godoycruz"],[21,"centralnorte","depmoron"],
  [21,"ferro","colon"],[21,"chacoforever","sanmiguel"],[21,"acassuso","santelmo"],
  [21,"quilmes","gimnasiajujuy"],[21,"colegiales","midland"],[21,"patronato","atlanta"],
  [21,"almagro","gimnasiatiro"],[21,"depmaipu","sanmartint"],[21,"temperley","rafaela"],
  [21,"nuevachicago","agropecuario"],[21,"sanmartinsj","tristanrey"],[21,"chacarita","guemes"],

  // ===== Fecha 22 =====
  [22,"racingcba","santelmo"],[22,"sanmiguel","acassuso"],[22,"colon","chacoforever"],
  [22,"depmoron","ferro"],[22,"godoycruz","centralnorte"],[22,"losandes","depmadryn"],
  [22,"allboys","defbelgrano"],[22,"estudiantesba","ciudadbolivar"],[22,"mitre","almirantebrown"],
  [22,"gimnasiajujuy","guemes"],[22,"tristanrey","chacarita"],[22,"agropecuario","sanmartinsj"],
  [22,"rafaela","nuevachicago"],[22,"sanmartint","temperley"],[22,"gimnasiatiro","depmaipu"],
  [22,"atlanta","almagro"],[22,"midland","patronato"],[22,"quilmes","colegiales"],

  // ===== Fecha 23 =====
  [23,"almirantebrown","racingcba"],[23,"ciudadbolivar","mitre"],[23,"defbelgrano","estudiantesba"],
  [23,"depmadryn","allboys"],[23,"centralnorte","losandes"],[23,"ferro","godoycruz"],
  [23,"chacoforever","depmoron"],[23,"acassuso","colon"],[23,"santelmo","sanmiguel"],
  [23,"colegiales","gimnasiajujuy"],[23,"patronato","quilmes"],[23,"almagro","midland"],
  [23,"depmaipu","atlanta"],[23,"temperley","gimnasiatiro"],[23,"nuevachicago","sanmartint"],
  [23,"sanmartinsj","rafaela"],[23,"chacarita","agropecuario"],[23,"guemes","tristanrey"],

  // ===== Fecha 24 =====
  [24,"racingcba","sanmiguel"],[24,"colon","santelmo"],[24,"depmoron","acassuso"],
  [24,"godoycruz","chacoforever"],[24,"losandes","ferro"],[24,"allboys","centralnorte"],
  [24,"estudiantesba","depmadryn"],[24,"mitre","defbelgrano"],[24,"almirantebrown","ciudadbolivar"],
  [24,"gimnasiajujuy","tristanrey"],[24,"agropecuario","guemes"],[24,"rafaela","chacarita"],
  [24,"sanmartint","sanmartinsj"],[24,"gimnasiatiro","nuevachicago"],[24,"atlanta","temperley"],
  [24,"midland","depmaipu"],[24,"quilmes","almagro"],[24,"colegiales","patronato"],

  // ===== Fecha 25 (interzonal clásicos) =====
  [25,"allboys","nuevachicago"],[25,"ferro","atlanta"],[25,"sanmartint","depmadryn"],
  [25,"gimnasiajujuy","chacoforever"],[25,"depmoron","almagro"],[25,"estudiantesba","chacarita"],
  [25,"racingcba","sanmartinsj"],[25,"temperley","losandes"],[25,"mitre","guemes"],
  [25,"tristanrey","almirantebrown"],[25,"agropecuario","ciudadbolivar"],[25,"colon","patronato"],
  [25,"centralnorte","gimnasiatiro"],[25,"godoycruz","depmaipu"],[25,"quilmes","santelmo"],
  [25,"sanmiguel","colegiales"],[25,"rafaela","defbelgrano"],[25,"acassuso","midland"],

  // ===== Fecha 26 =====
  [26,"ciudadbolivar","racingcba"],[26,"defbelgrano","almirantebrown"],[26,"depmadryn","mitre"],
  [26,"centralnorte","estudiantesba"],[26,"ferro","allboys"],[26,"chacoforever","losandes"],
  [26,"acassuso","godoycruz"],[26,"santelmo","depmoron"],[26,"sanmiguel","colon"],
  [26,"patronato","gimnasiajujuy"],[26,"almagro","colegiales"],[26,"depmaipu","quilmes"],
  [26,"temperley","midland"],[26,"nuevachicago","atlanta"],[26,"sanmartinsj","gimnasiatiro"],
  [26,"chacarita","sanmartint"],[26,"guemes","rafaela"],[26,"tristanrey","agropecuario"],

  // ===== Fecha 27 =====
  [27,"racingcba","colon"],[27,"depmoron","sanmiguel"],[27,"godoycruz","santelmo"],
  [27,"losandes","acassuso"],[27,"allboys","chacoforever"],[27,"estudiantesba","ferro"],
  [27,"mitre","centralnorte"],[27,"almirantebrown","depmadryn"],[27,"ciudadbolivar","defbelgrano"],
  [27,"gimnasiajujuy","agropecuario"],[27,"rafaela","tristanrey"],[27,"sanmartint","guemes"],
  [27,"gimnasiatiro","chacarita"],[27,"atlanta","sanmartinsj"],[27,"midland","nuevachicago"],
  [27,"quilmes","temperley"],[27,"colegiales","depmaipu"],[27,"patronato","almagro"],

  // ===== Fecha 28 =====
  [28,"defbelgrano","racingcba"],[28,"depmadryn","ciudadbolivar"],[28,"centralnorte","almirantebrown"],
  [28,"ferro","mitre"],[28,"chacoforever","estudiantesba"],[28,"acassuso","allboys"],
  [28,"santelmo","losandes"],[28,"sanmiguel","godoycruz"],[28,"colon","depmoron"],
  [28,"almagro","gimnasiajujuy"],[28,"depmaipu","patronato"],[28,"temperley","colegiales"],
  [28,"nuevachicago","quilmes"],[28,"sanmartinsj","midland"],[28,"chacarita","atlanta"],
  [28,"guemes","gimnasiatiro"],[28,"tristanrey","sanmartint"],[28,"agropecuario","rafaela"],

  // ===== Fecha 29 =====
  [29,"racingcba","depmoron"],[29,"godoycruz","colon"],[29,"losandes","sanmiguel"],
  [29,"allboys","santelmo"],[29,"estudiantesba","acassuso"],[29,"mitre","chacoforever"],
  [29,"almirantebrown","ferro"],[29,"ciudadbolivar","centralnorte"],[29,"defbelgrano","depmadryn"],
  [29,"gimnasiajujuy","rafaela"],[29,"sanmartint","agropecuario"],[29,"gimnasiatiro","tristanrey"],
  [29,"atlanta","guemes"],[29,"midland","chacarita"],[29,"quilmes","sanmartinsj"],
  [29,"colegiales","nuevachicago"],[29,"patronato","temperley"],[29,"almagro","depmaipu"],

  // ===== Fecha 30 =====
  [30,"depmadryn","racingcba"],[30,"centralnorte","defbelgrano"],[30,"ferro","ciudadbolivar"],
  [30,"chacoforever","almirantebrown"],[30,"acassuso","mitre"],[30,"santelmo","estudiantesba"],
  [30,"sanmiguel","allboys"],[30,"colon","losandes"],[30,"depmoron","godoycruz"],
  [30,"depmaipu","gimnasiajujuy"],[30,"temperley","almagro"],[30,"nuevachicago","patronato"],
  [30,"sanmartinsj","colegiales"],[30,"chacarita","quilmes"],[30,"guemes","midland"],
  [30,"tristanrey","atlanta"],[30,"agropecuario","gimnasiatiro"],[30,"rafaela","sanmartint"],

  // ===== Fecha 31 =====
  [31,"racingcba","godoycruz"],[31,"losandes","depmoron"],[31,"allboys","colon"],
  [31,"estudiantesba","sanmiguel"],[31,"mitre","santelmo"],[31,"almirantebrown","acassuso"],
  [31,"ciudadbolivar","chacoforever"],[31,"defbelgrano","ferro"],[31,"depmadryn","centralnorte"],
  [31,"gimnasiajujuy","sanmartint"],[31,"gimnasiatiro","rafaela"],[31,"atlanta","agropecuario"],
  [31,"midland","tristanrey"],[31,"quilmes","guemes"],[31,"colegiales","chacarita"],
  [31,"patronato","sanmartinsj"],[31,"almagro","nuevachicago"],[31,"depmaipu","temperley"],

  // ===== Fecha 32 =====
  [32,"centralnorte","racingcba"],[32,"ferro","depmadryn"],[32,"chacoforever","defbelgrano"],
  [32,"acassuso","ciudadbolivar"],[32,"santelmo","almirantebrown"],[32,"sanmiguel","mitre"],
  [32,"colon","estudiantesba"],[32,"depmoron","allboys"],[32,"godoycruz","losandes"],
  [32,"temperley","gimnasiajujuy"],[32,"nuevachicago","depmaipu"],[32,"sanmartinsj","almagro"],
  [32,"chacarita","patronato"],[32,"guemes","colegiales"],[32,"tristanrey","quilmes"],
  [32,"agropecuario","midland"],[32,"rafaela","atlanta"],[32,"sanmartint","gimnasiatiro"],

  // ===== Fecha 33 =====
  [33,"racingcba","losandes"],[33,"allboys","godoycruz"],[33,"estudiantesba","depmoron"],
  [33,"mitre","colon"],[33,"almirantebrown","sanmiguel"],[33,"ciudadbolivar","santelmo"],
  [33,"defbelgrano","acassuso"],[33,"depmadryn","chacoforever"],[33,"centralnorte","ferro"],
  [33,"gimnasiajujuy","gimnasiatiro"],[33,"atlanta","sanmartint"],[33,"midland","rafaela"],
  [33,"quilmes","agropecuario"],[33,"colegiales","tristanrey"],[33,"patronato","guemes"],
  [33,"almagro","chacarita"],[33,"depmaipu","sanmartinsj"],[33,"temperley","nuevachicago"],

  // ===== Fecha 34 =====
  [34,"ferro","racingcba"],[34,"chacoforever","centralnorte"],[34,"acassuso","depmadryn"],
  [34,"santelmo","defbelgrano"],[34,"sanmiguel","ciudadbolivar"],[34,"colon","almirantebrown"],
  [34,"depmoron","mitre"],[34,"godoycruz","estudiantesba"],[34,"losandes","allboys"],
  [34,"nuevachicago","gimnasiajujuy"],[34,"sanmartinsj","temperley"],[34,"chacarita","depmaipu"],
  [34,"guemes","almagro"],[34,"tristanrey","patronato"],[34,"agropecuario","colegiales"],
  [34,"rafaela","quilmes"],[34,"sanmartint","midland"],[34,"gimnasiatiro","atlanta"],

  // ===== Fecha 35 =====
  [35,"racingcba","allboys"],[35,"estudiantesba","losandes"],[35,"mitre","godoycruz"],
  [35,"almirantebrown","depmoron"],[35,"ciudadbolivar","colon"],[35,"defbelgrano","sanmiguel"],
  [35,"depmadryn","santelmo"],[35,"centralnorte","acassuso"],[35,"ferro","chacoforever"],
  [35,"gimnasiajujuy","atlanta"],[35,"midland","gimnasiatiro"],[35,"quilmes","sanmartint"],
  [35,"colegiales","rafaela"],[35,"patronato","agropecuario"],[35,"almagro","tristanrey"],
  [35,"depmaipu","guemes"],[35,"temperley","chacarita"],[35,"nuevachicago","sanmartinsj"],

  // ===== Fecha 36 =====
  [36,"chacoforever","racingcba"],[36,"acassuso","ferro"],[36,"santelmo","centralnorte"],
  [36,"sanmiguel","depmadryn"],[36,"colon","defbelgrano"],[36,"depmoron","ciudadbolivar"],
  [36,"godoycruz","almirantebrown"],[36,"losandes","mitre"],[36,"allboys","estudiantesba"],
  [36,"sanmartinsj","gimnasiajujuy"],[36,"chacarita","nuevachicago"],[36,"guemes","temperley"],
  [36,"tristanrey","depmaipu"],[36,"agropecuario","almagro"],[36,"rafaela","patronato"],
  [36,"sanmartint","colegiales"],[36,"gimnasiatiro","quilmes"],[36,"atlanta","midland"],
];

// Pares interzonales considerados clásicos para resaltar.
const CLASICOS_PAIRS: Array<[string, string]> = [
  ["allboys","nuevachicago"],["ferro","atlanta"],["losandes","temperley"],
  ["colon","patronato"],["mitre","guemes"],["centralnorte","gimnasiatiro"],
  ["chacarita","defbelgrano"],["quilmes","depmoron"],["sanmartint","godoycruz"],
];
const _key = (a: string, b: string) => [a,b].sort().join("|");
const CLASICO_SET = new Set(CLASICOS_PAIRS.map(([a,b]) => _key(a,b)));
export const isClasicoMatch = (a: string, b: string) => CLASICO_SET.has(_key(a,b));
