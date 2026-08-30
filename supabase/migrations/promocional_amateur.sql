-- Promocional Amateur 2026
-- Inserta los 17 clubes con zona A/B y sus stats.
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS regional_region text;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS regional_group text;

INSERT INTO public.teams (id,name,short,city,zone,division,primary_color,secondary_color,stripe,speed,jump,power,defense,logo_url,rivals,goal_audio_urls,hinchada_urls,narrators,flag_urls,sort_order) VALUES
('deportivometalurgico','Deportivo Metalúrgico','MET','Buenos Aires','A','promocional_amateur','#6b7280','#111827','solid',66,69,67,65,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,0),
('satmoreno','SAT Moreno','SAT','Buenos Aires','A','promocional_amateur','#6b7280','#111827','solid',64,66,65,64,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,1),
('defensoresdeglew','Defensores de Glew','DG','Buenos Aires','A','promocional_amateur','#6b7280','#111827','solid',68,70,67,67,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,2),
('nauticohacoaj','Náutico Hacoaj','HAC','Buenos Aires','A','promocional_amateur','#6b7280','#111827','solid',65,68,65,66,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,3),
('estrelladeberisso','Estrella de Berisso','EDB','Buenos Aires','A','promocional_amateur','#6b7280','#111827','solid',61,62,62,60,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,4),
('atleticopilar','Atlético Pilar','AP','Buenos Aires','A','promocional_amateur','#6b7280','#111827','solid',59,60,60,58,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,5),
('provincialdelobos','Provincial de Lobos','PDL','Buenos Aires','A','promocional_amateur','#6b7280','#111827','solid',56,56,58,55,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,6),
('juventuddebernal','Juventud de Bernal','JDB','Buenos Aires','A','promocional_amateur','#6b7280','#111827','solid',55,55,57,54,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,7),
('barrancasumetfc','Barrancas UMET FC','BUF','Buenos Aires','B','promocional_amateur','#6b7280','#111827','solid',63,65,64,62,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,8),
('buenosairescityfc','Buenos Aires City FC','BAC','Buenos Aires','B','promocional_amateur','#6b7280','#111827','solid',62,64,62,61,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,9),
('uribelarrea','Uribelarrea FC','URI','Buenos Aires','B','promocional_amateur','#6b7280','#111827','solid',61,64,61,62,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,10),
('fcezeiza','Fútbol Club Ezeiza','FCE','Buenos Aires','B','promocional_amateur','#6b7280','#111827','solid',60,61,62,59,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,11),
('belgranodezarate','Belgrano de Zárate','BDZ','Buenos Aires','B','promocional_amateur','#6b7280','#111827','solid',59,60,61,60,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,12),
('alumniloshornos','Alumni Los Hornos','ALH','Buenos Aires','B','promocional_amateur','#6b7280','#111827','solid',60,61,60,58,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,13),
('controlorientado','Control Orientado','COR','Buenos Aires','B','promocional_amateur','#6b7280','#111827','solid',58,60,60,57,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,14),
('lasmandarinas','Las Mandarinas','LMA','Buenos Aires','B','promocional_amateur','#6b7280','#111827','solid',57,58,59,56,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,15),
('evertondelaplata','Everton de La Plata','EDL','Buenos Aires','B','promocional_amateur','#6b7280','#111827','solid',58,59,58,57,NULL,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'[]'::jsonb,'{}'::jsonb,16)
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, short=EXCLUDED.short, city=EXCLUDED.city, zone=EXCLUDED.zone,
  division=EXCLUDED.division, speed=EXCLUDED.speed, jump=EXCLUDED.jump, power=EXCLUDED.power, defense=EXCLUDED.defense;

SELECT zone, COUNT(*) AS equipos FROM public.teams WHERE division='promocional_amateur' GROUP BY zone ORDER BY zone;
