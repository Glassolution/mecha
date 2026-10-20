-- Medidas quadradas vindas do TikTok não dizem a orientação: deixa em branco em vez de "deitado".
update videos set vertical = null where largura is not null and largura = altura;
