insert into public.produtos (nome, sku, categoria, unidade_medida, estoque_atual, estoque_minimo, preco_custo, preco_venda)
values
  ('Tela iPhone 13', 'TELA-IP13', 'tela', 'un', 12, 3, 350, 590),
  ('Bateria Notebook Dell', 'BAT-DEL-01', 'bateria', 'un', 8, 2, 180, 320),
  ('Conector USB-C Universal', 'CON-USBC', 'conector', 'un', 40, 10, 15, 40)
on conflict (sku) do nothing;

insert into public.clientes (nome_razao_social, cpf_cnpj, telefone, email, endereco, cep)
values
  ('Joao Silva', '123.456.789-00', '(11) 98888-7777', 'joao@email.com', 'Rua A, 123', '01001-000'),
  ('Empresa XPTO LTDA', '12.345.678/0001-99', '(11) 3444-2233', 'financeiro@xpto.com', 'Av. Central, 890', '01310-100')
on conflict (cpf_cnpj) do nothing;
