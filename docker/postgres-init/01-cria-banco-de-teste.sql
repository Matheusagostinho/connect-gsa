-- Banco separado para a suíte de testes.
--
-- Os testes limpam tabelas inteiras entre casos. Apontá-los para o mesmo banco
-- do desenvolvimento apagaria, a cada `pnpm test`, as pessoas e convites que
-- você acabou de semear para navegar pelo aplicativo.
CREATE DATABASE connectgsa_test;
