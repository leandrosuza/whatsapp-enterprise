import { sequelize } from '../infrastructure/database/database';
import '../core/entities/DDD'; // Garante o registro do modelo
import { DDD } from '../core/entities';

const brazilianDDDs = [
  // Região Sudeste
  // São Paulo (SP)
  { ddd: '11', state: 'São Paulo', stateCode: 'SP', region: 'Sudeste', regionCode: 'SE', cities: ['São Paulo', 'Guarulhos', 'Santo André', 'São Bernardo do Campo', 'Osasco', 'Mogi das Cruzes', 'Santos', 'Ribeirão Pires', 'Mauá', 'Diadema'], description: 'Capital e região metropolitana' },
  { ddd: '12', state: 'São Paulo', stateCode: 'SP', region: 'Sudeste', regionCode: 'SE', cities: ['São José dos Campos', 'Taubaté', 'Pindamonhangaba', 'Lorena', 'Guaratinguetá', 'Aparecida', 'Cruzeiro', 'Cachoeira Paulista'], description: 'Vale do Paraíba' },
  { ddd: '13', state: 'São Paulo', stateCode: 'SP', region: 'Sudeste', regionCode: 'SE', cities: ['Santos', 'São Vicente', 'Cubatão', 'Guarujá', 'Praia Grande', 'Mongaguá', 'Itanhaém', 'Peruíbe'], description: 'Baixada Santista' },
  { ddd: '14', state: 'São Paulo', stateCode: 'SP', region: 'Sudeste', regionCode: 'SE', cities: ['Bauru', 'Marília', 'Jaú', 'Botucatu', 'Avaré', 'Lins', 'Agudos', 'Lençóis Paulista'], description: 'Bauru, Marília e região' },
  { ddd: '15', state: 'São Paulo', stateCode: 'SP', region: 'Sudeste', regionCode: 'SE', cities: ['Sorocaba', 'Itu', 'Salto', 'Tatuí', 'Itapetininga', 'Votorantim', 'Piedade', 'Capão Bonito'], description: 'Sorocaba e região' },
  { ddd: '16', state: 'São Paulo', stateCode: 'SP', region: 'Sudeste', regionCode: 'SE', cities: ['Ribeirão Preto', 'Araraquara', 'São Carlos', 'Franca', 'Barretos', 'Batatais', 'Jaboticabal', 'Sertãozinho'], description: 'Ribeirão Preto e região' },
  { ddd: '17', state: 'São Paulo', stateCode: 'SP', region: 'Sudeste', regionCode: 'SE', cities: ['São José do Rio Preto', 'Catanduva', 'Votuporanga', 'Fernandópolis', 'Jales', 'Araçatuba', 'Birigui', 'Penápolis'], description: 'São José do Rio Preto e região' },
  { ddd: '18', state: 'São Paulo', stateCode: 'SP', region: 'Sudeste', regionCode: 'SE', cities: ['Presidente Prudente', 'Pirapozinho', 'Álvares Machado', 'Presidente Bernardes', 'Adamantina', 'Dracena', 'Tupã', 'Marília'], description: 'Presidente Prudente e região' },
  { ddd: '19', state: 'São Paulo', stateCode: 'SP', region: 'Sudeste', regionCode: 'SE', cities: ['Campinas', 'Piracicaba', 'Limeira', 'Americana', 'Santa Bárbara d\'Oeste', 'Hortolândia', 'Sumaré', 'Indaiatuba'], description: 'Campinas e região' },

  // Rio de Janeiro (RJ)
  { ddd: '21', state: 'Rio de Janeiro', stateCode: 'RJ', region: 'Sudeste', regionCode: 'SE', cities: ['Rio de Janeiro', 'Niterói', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Belford Roxo', 'São João de Meriti', 'Mesquita'], description: 'Capital e Baixada Fluminense' },
  { ddd: '22', state: 'Rio de Janeiro', stateCode: 'RJ', region: 'Sudeste', regionCode: 'SE', cities: ['Campos dos Goytacazes', 'Macaé', 'Cabo Frio', 'Armação dos Búzios', 'Arraial do Cabo', 'São Pedro da Aldeia', 'Iguaba Grande', 'Araruama'], description: 'Região dos Lagos, Norte Fluminense' },
  { ddd: '24', state: 'Rio de Janeiro', stateCode: 'RJ', region: 'Sudeste', regionCode: 'SE', cities: ['Petrópolis', 'Nova Friburgo', 'Teresópolis', 'Três Rios', 'Paraíba do Sul', 'Barra do Piraí', 'Volta Redonda', 'Barra Mansa'], description: 'Região Serrana, Sul Fluminense' },

  // Minas Gerais (MG)
  { ddd: '31', state: 'Minas Gerais', stateCode: 'MG', region: 'Sudeste', regionCode: 'SE', cities: ['Belo Horizonte', 'Contagem', 'Betim', 'Nova Lima', 'Sabará', 'Santa Luzia', 'Vespasiano', 'Lagoa Santa'], description: 'Belo Horizonte e região metropolitana' },
  { ddd: '32', state: 'Minas Gerais', stateCode: 'MG', region: 'Sudeste', regionCode: 'SE', cities: ['Juiz de Fora', 'Cataguases', 'Leopoldina', 'Ubá', 'Muriaé', 'Viçosa', 'Ponte Nova', 'Manhuaçu'], description: 'Zona da Mata' },
  { ddd: '33', state: 'Minas Gerais', stateCode: 'MG', region: 'Sudeste', regionCode: 'SE', cities: ['Governador Valadares', 'Ipatinga', 'Coronel Fabriciano', 'Timóteo', 'Caratinga', 'Mantena', 'Aimorés', 'Resplendor'], description: 'Vale do Rio Doce' },
  { ddd: '34', state: 'Minas Gerais', stateCode: 'MG', region: 'Sudeste', regionCode: 'SE', cities: ['Uberlândia', 'Uberaba', 'Araguari', 'Ituiutaba', 'Monte Carmelo', 'Patrocínio', 'Patos de Minas', 'Araxá'], description: 'Triângulo Mineiro' },
  { ddd: '35', state: 'Minas Gerais', stateCode: 'MG', region: 'Sudeste', regionCode: 'SE', cities: ['Divinópolis', 'Itaúna', 'Nova Serrana', 'Cláudio', 'Carmo do Cajuru', 'São Gonçalo do Pará', 'Perdigão', 'Oliveira'], description: 'Centro-Oeste de Minas' },
  { ddd: '37', state: 'Minas Gerais', stateCode: 'MG', region: 'Sudeste', regionCode: 'SE', cities: ['Divinópolis', 'Itaúna', 'Nova Serrana', 'Cláudio', 'Carmo do Cajuru', 'São Gonçalo do Pará', 'Perdigão', 'Oliveira'], description: 'Centro-Oeste de Minas' },
  { ddd: '38', state: 'Minas Gerais', stateCode: 'MG', region: 'Sudeste', regionCode: 'SE', cities: ['Montes Claros', 'Pirapora', 'Januária', 'Janaúba', 'Salinas', 'Diamantina', 'Curvelo', 'Bocaiúva'], description: 'Norte de Minas' },

  // Espírito Santo (ES)
  { ddd: '27', state: 'Espírito Santo', stateCode: 'ES', region: 'Sudeste', regionCode: 'SE', cities: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Linhares', 'Aracruz', 'Guarapari', 'Fundão'], description: 'Grande Vitória' },
  { ddd: '28', state: 'Espírito Santo', stateCode: 'ES', region: 'Sudeste', regionCode: 'SE', cities: ['Cachoeiro de Itapemirim', 'Itapemirim', 'Marataízes', 'Piúma', 'Anchieta', 'Iconha', 'Rio Novo do Sul', 'Vargem Alta'], description: 'Sul do Estado' },

  // Região Sul
  // Paraná (PR)
  { ddd: '41', state: 'Paraná', stateCode: 'PR', region: 'Sul', regionCode: 'S', cities: ['Curitiba', 'São José dos Pinhais', 'Pinhais', 'Colombo', 'Araucária', 'Fazenda Rio Grande', 'Almirante Tamandaré', 'Campo Largo'], description: 'Curitiba e região metropolitana' },
  { ddd: '42', state: 'Paraná', stateCode: 'PR', region: 'Sul', regionCode: 'S', cities: ['Ponta Grossa', 'Castro', 'Carambeí', 'Palmeira', 'Tibagi', 'Telêmaco Borba', 'Imbituva', 'Irati'], description: 'Centro-Sul' },
  { ddd: '43', state: 'Paraná', stateCode: 'PR', region: 'Sul', regionCode: 'S', cities: ['Londrina', 'Arapongas', 'Apucarana', 'Cambé', 'Rolândia', 'Ibiporã', 'Jataizinho', 'Tamarana'], description: 'Norte Pioneiro' },
  { ddd: '44', state: 'Paraná', stateCode: 'PR', region: 'Sul', regionCode: 'S', cities: ['Maringá', 'Sarandi', 'Paiçandu', 'Astorga', 'Mandaguari', 'Jandaia do Sul', 'Cambira', 'Marialva'], description: 'Noroeste' },
  { ddd: '45', state: 'Paraná', stateCode: 'PR', region: 'Sul', regionCode: 'S', cities: ['Foz do Iguaçu', 'Cascavel', 'Toledo', 'Medianeira', 'Santa Terezinha de Itaipu', 'São Miguel do Iguaçu', 'Matelândia', 'Missal'], description: 'Oeste' },
  { ddd: '46', state: 'Paraná', stateCode: 'PR', region: 'Sul', regionCode: 'S', cities: ['Francisco Beltrão', 'Pato Branco', 'Dois Vizinhos', 'Coronel Vivida', 'Palmas', 'Chopinzinho', 'Mangueirinha', 'Clevelândia'], description: 'Sudoeste' },

  // Santa Catarina (SC)
  { ddd: '47', state: 'Santa Catarina', stateCode: 'SC', region: 'Sul', regionCode: 'S', cities: ['Blumenau', 'Joinville', 'Itajaí', 'Balneário Camboriú', 'Brusque', 'Timbó', 'Indaial', 'Gaspar'], description: 'Norte' },
  { ddd: '48', state: 'Santa Catarina', stateCode: 'SC', region: 'Sul', regionCode: 'S', cities: ['Florianópolis', 'São José', 'Palhoça', 'Biguaçu', 'Santo Amaro da Imperatriz', 'Águas Mornas', 'Antônio Carlos', 'Governador Celso Ramos'], description: 'Grande Florianópolis' },
  { ddd: '49', state: 'Santa Catarina', stateCode: 'SC', region: 'Sul', regionCode: 'S', cities: ['Chapecó', 'Lages', 'Joaçaba', 'Concórdia', 'Caçador', 'Videira', 'Campos Novos', 'Curitibanos'], description: 'Oeste' },

  // Rio Grande do Sul (RS)
  { ddd: '51', state: 'Rio Grande do Sul', stateCode: 'RS', region: 'Sul', regionCode: 'S', cities: ['Porto Alegre', 'Canoas', 'Gravataí', 'Cachoeirinha', 'Alvorada', 'Viamão', 'Sapucaia do Sul', 'Esteio'], description: 'Porto Alegre e região metropolitana' },
  { ddd: '53', state: 'Rio Grande do Sul', stateCode: 'RS', region: 'Sul', regionCode: 'S', cities: ['Pelotas', 'Rio Grande', 'Bagé', 'Canguçu', 'Capão do Leão', 'Arroio Grande', 'Pedro Osório', 'Herval'], description: 'Sul' },
  { ddd: '54', state: 'Rio Grande do Sul', stateCode: 'RS', region: 'Sul', regionCode: 'S', cities: ['Caxias do Sul', 'Bento Gonçalves', 'Farroupilha', 'Garibaldi', 'Carlos Barbosa', 'Flores da Cunha', 'Nova Petrópolis', 'Gramado'], description: 'Serra Gaúcha' },
  { ddd: '55', state: 'Rio Grande do Sul', stateCode: 'RS', region: 'Sul', regionCode: 'S', cities: ['Santa Maria', 'Santiago', 'Cruz Alta', 'Santo Ângelo', 'Ijuí', 'Passo Fundo', 'Carazinho', 'Palmeira das Missões'], description: 'Noroeste' },

  // Região Centro-Oeste
  // Distrito Federal (DF)
  { ddd: '61', state: 'Distrito Federal', stateCode: 'DF', region: 'Centro-Oeste', regionCode: 'CO', cities: ['Brasília', 'Ceilândia', 'Taguatinga', 'Samambaia', 'Plano Piloto', 'Guará', 'Núcleo Bandeirante', 'Candangolândia'], description: 'Distrito Federal' },

  // Goiás (GO)
  { ddd: '62', state: 'Goiás', stateCode: 'GO', region: 'Centro-Oeste', regionCode: 'CO', cities: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Trindade', 'Senador Canedo', 'Bela Vista de Goiás', 'Inhumas', 'Itaberaí'], description: 'Goiânia e região' },
  { ddd: '64', state: 'Goiás', stateCode: 'GO', region: 'Centro-Oeste', regionCode: 'CO', cities: ['Rio Verde', 'Jataí', 'Mineiros', 'Santa Helena de Goiás', 'Caiapônia', 'Montividiu', 'Santo Antônio da Barra', 'Itumbiara'], description: 'Sul de Goiás' },

  // Mato Grosso (MT)
  { ddd: '65', state: 'Mato Grosso', stateCode: 'MT', region: 'Centro-Oeste', regionCode: 'CO', cities: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Barra do Garças', 'Primavera do Leste', 'Lucas do Rio Verde'], description: 'Cuiabá e região' },
  { ddd: '66', state: 'Mato Grosso', stateCode: 'MT', region: 'Centro-Oeste', regionCode: 'CO', cities: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Barra do Garças', 'Primavera do Leste', 'Lucas do Rio Verde'], description: 'Cuiabá e região' },

  // Mato Grosso do Sul (MS)
  { ddd: '67', state: 'Mato Grosso do Sul', stateCode: 'MS', region: 'Centro-Oeste', regionCode: 'CO', cities: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Nova Andradina', 'Aquidauana', 'Coxim'], description: 'Campo Grande e região' },

  // Região Nordeste
  // Bahia (BA)
  { ddd: '71', state: 'Bahia', stateCode: 'BA', region: 'Nordeste', regionCode: 'NE', cities: ['Salvador', 'Lauro de Freitas', 'Camaçari', 'Simões Filho', 'Candeias', 'Dias d\'Ávila', 'São Francisco do Conde', 'Madre de Deus'], description: 'Salvador e região metropolitana' },
  { ddd: '73', state: 'Bahia', stateCode: 'BA', region: 'Nordeste', regionCode: 'NE', cities: ['Ilhéus', 'Itabuna', 'Porto Seguro', 'Eunápolis', 'Teixeira de Freitas', 'Itamaraju', 'Prado', 'Santa Cruz Cabrália'], description: 'Sul da Bahia' },
  { ddd: '74', state: 'Bahia', stateCode: 'BA', region: 'Nordeste', regionCode: 'NE', cities: ['Feira de Santana', 'Vitória da Conquista', 'Jequié', 'Itabuna', 'Ilhéus', 'Porto Seguro', 'Eunápolis', 'Teixeira de Freitas'], description: 'Feira de Santana e região' },
  { ddd: '75', state: 'Bahia', stateCode: 'BA', region: 'Nordeste', regionCode: 'NE', cities: ['Salvador', 'Lauro de Freitas', 'Camaçari', 'Simões Filho', 'Candeias', 'Dias d\'Ávila', 'São Francisco do Conde', 'Madre de Deus'], description: 'Salvador e região metropolitana' },
  { ddd: '77', state: 'Bahia', stateCode: 'BA', region: 'Nordeste', regionCode: 'NE', cities: ['Barreiras', 'Luís Eduardo Magalhães', 'Bom Jesus da Lapa', 'Irecê', 'Juazeiro', 'Paulo Afonso', 'Petrolina', 'Senhor do Bonfim'], description: 'Oeste da Bahia' },

  // Sergipe (SE)
  { ddd: '79', state: 'Sergipe', stateCode: 'SE', region: 'Nordeste', regionCode: 'NE', cities: ['Aracaju', 'Nossa Senhora do Socorro', 'São Cristóvão', 'Lagarto', 'Itabaiana', 'Estância', 'Tobias Barreto', 'Poço Redondo'], description: 'Aracaju e região' },

  // Alagoas (AL)
  { ddd: '82', state: 'Alagoas', stateCode: 'AL', region: 'Nordeste', regionCode: 'NE', cities: ['Maceió', 'Arapiraca', 'Palmeira dos Índios', 'Penedo', 'Pilar', 'São Miguel dos Campos', 'Piranhas', 'Delmiro Gouveia'], description: 'Maceió e região' },

  // Pernambuco (PE)
  { ddd: '81', state: 'Pernambuco', stateCode: 'PE', region: 'Nordeste', regionCode: 'NE', cities: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Paulista', 'Camaragibe', 'São Lourenço da Mata', 'Igarassu', 'Abreu e Lima'], description: 'Recife e região metropolitana' },
  { ddd: '87', state: 'Pernambuco', stateCode: 'PE', region: 'Nordeste', regionCode: 'NE', cities: ['Petrolina', 'Garanhuns', 'Caruaru', 'Vitória de Santo Antão', 'Escada', 'Cabo de Santo Agostinho', 'Ipojuca', 'São José do Egito'], description: 'Interior de Pernambuco' },

  // Paraíba (PB)
  { ddd: '83', state: 'Paraíba', stateCode: 'PB', region: 'Nordeste', regionCode: 'NE', cities: ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Bayeux', 'Patos', 'Sousa', 'Cajazeiras', 'Guarabira'], description: 'João Pessoa e região' },

  // Rio Grande do Norte (RN)
  { ddd: '84', state: 'Rio Grande do Norte', stateCode: 'RN', region: 'Nordeste', regionCode: 'NE', cities: ['Natal', 'Mossoró', 'Parnamirim', 'Ceará-Mirim', 'São Gonçalo do Amarante', 'Canguaretama', 'Caicó', 'Currais Novos'], description: 'Natal e região' },

  // Ceará (CE)
  { ddd: '85', state: 'Ceará', stateCode: 'CE', region: 'Nordeste', regionCode: 'NE', cities: ['Fortaleza', 'Caucaia', 'Maracanaú', 'Sobral', 'Juazeiro do Norte', 'Crato', 'Barbalha', 'Iguatu'], description: 'Fortaleza e região metropolitana' },
  { ddd: '88', state: 'Ceará', stateCode: 'CE', region: 'Nordeste', regionCode: 'NE', cities: ['Juazeiro do Norte', 'Crato', 'Barbalha', 'Iguatu', 'Sobral', 'Caucaia', 'Maracanaú', 'Quixadá'], description: 'Interior do Ceará' },

  // Piauí (PI)
  { ddd: '86', state: 'Piauí', stateCode: 'PI', region: 'Nordeste', regionCode: 'NE', cities: ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Barras', 'Esperantina', 'Altos'], description: 'Teresina e região' },
  { ddd: '89', state: 'Piauí', stateCode: 'PI', region: 'Nordeste', regionCode: 'NE', cities: ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Barras', 'Esperantina', 'Altos'], description: 'Teresina e região' },

  // Região Norte
  // Pará (PA)
  { ddd: '91', state: 'Pará', stateCode: 'PA', region: 'Norte', regionCode: 'N', cities: ['Belém', 'Ananindeua', 'Castanhal', 'Marituba', 'Barcarena', 'Santarém', 'Altamira', 'Marabá'], description: 'Belém e região metropolitana' },
  { ddd: '93', state: 'Pará', stateCode: 'PA', region: 'Norte', regionCode: 'N', cities: ['Santarém', 'Altamira', 'Marabá', 'Itaituba', 'Parauapebas', 'Tucuruí', 'Redenção', 'Xinguara'], description: 'Santarém e região' },
  { ddd: '94', state: 'Pará', stateCode: 'PA', region: 'Norte', regionCode: 'N', cities: ['Marabá', 'Parauapebas', 'Redenção', 'Xinguara', 'Conceição do Araguaia', 'São Félix do Xingu', 'Ourilândia do Norte', 'Tucumã'], description: 'Marabá e região' },

  // Amazonas (AM)
  { ddd: '92', state: 'Amazonas', stateCode: 'AM', region: 'Norte', regionCode: 'N', cities: ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé', 'Tabatinga', 'Benjamin Constant'], description: 'Manaus e região' },
  { ddd: '97', state: 'Amazonas', stateCode: 'AM', region: 'Norte', regionCode: 'N', cities: ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé', 'Tabatinga', 'Benjamin Constant'], description: 'Manaus e região' },

  // Acre (AC)
  { ddd: '68', state: 'Acre', stateCode: 'AC', region: 'Norte', regionCode: 'N', cities: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Brasiléia', 'Xapuri', 'Plácido de Castro'], description: 'Rio Branco e região' },

  // Rondônia (RO)
  { ddd: '69', state: 'Rondônia', stateCode: 'RO', region: 'Norte', regionCode: 'N', cities: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal', 'Guajará-Mirim', 'Rolim de Moura', 'Pimenta Bueno'], description: 'Porto Velho e região' },

  // Amapá (AP)
  { ddd: '96', state: 'Amapá', stateCode: 'AP', region: 'Norte', regionCode: 'N', cities: ['Macapá', 'Santana', 'Mazagão', 'Laranjal do Jari', 'Oiapoque', 'Tartarugalzinho', 'Pedra Branca do Amapari', 'Calçoene'], description: 'Macapá e região' },

  // Roraima (RR)
  { ddd: '95', state: 'Roraima', stateCode: 'RR', region: 'Norte', regionCode: 'N', cities: ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Mucajaí', 'Cantá', 'Normandia', 'Uiramutã'], description: 'Boa Vista e região' },

  // Tocantins (TO)
  { ddd: '63', state: 'Tocantins', stateCode: 'TO', region: 'Norte', regionCode: 'N', cities: ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Colinas do Tocantins', 'Dianópolis', 'Miracema do Tocantins'], description: 'Palmas e região' },
];

export async function seedDDDs() {
  try {
    console.log('🌱 Iniciando seed dos DDDs brasileiros...');
    // Garante que a tabela DDD está sincronizada
    await sequelize.sync({ force: false });
    // Limpar dados existentes
    await DDD.destroy({ where: {} });
    console.log('🗑️ Dados existentes removidos');
    // Inserir novos dados
    const createdDDDs = await DDD.bulkCreate(brazilianDDDs);
    console.log(`✅ ${createdDDDs.length} DDDs inseridos com sucesso!`);
    // Log de resumo por região
    const regions = [...new Set(brazilianDDDs.map(ddd => ddd.region))];
    for (const region of regions) {
      const count = brazilianDDDs.filter(ddd => ddd.region === region).length;
      console.log(`📊 ${region}: ${count} DDDs`);
    }
    console.log('🎉 Seed dos DDDs concluído com sucesso!');
    return createdDDDs;
  } catch (error) {
    console.error('❌ Erro ao fazer seed dos DDDs:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  import('../infrastructure/database/database').then(async () => {
    await seedDDDs();
    process.exit(0);
  }).catch(error => {
    console.error('❌ Erro ao conectar ao banco:', error);
    process.exit(1);
  });
}