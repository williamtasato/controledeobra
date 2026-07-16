-- Migração: Criar tabelas para Equipamentos, Profissionais e Condições Climáticas

-- Tabela de Equipamentos
CREATE TABLE IF NOT EXISTS `equipamentos` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `descricao` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Profissionais (Mão de Obra)
CREATE TABLE IF NOT EXISTS `profissionais` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `tipo` enum('Padrão','Personalizada','Grupo') DEFAULT 'Padrão',
  `descricao` text,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nome` (`nome`),
  KEY `idx_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Relacionamento: Tarefa - Equipamentos
CREATE TABLE IF NOT EXISTS `tarefa_equipamentos` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tarefa_id` bigint(20) NOT NULL,
  `equipamento_id` bigint(20) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tarefa_id` (`tarefa_id`),
  KEY `idx_equipamento_id` (`equipamento_id`),
  UNIQUE KEY `uk_tarefa_equipamento` (`tarefa_id`, `equipamento_id`),
  CONSTRAINT `fk_tarefa_equipamentos_tarefa` FOREIGN KEY (`tarefa_id`) REFERENCES `tarefadiarias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tarefa_equipamentos_equipamento` FOREIGN KEY (`equipamento_id`) REFERENCES `equipamentos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Relacionamento: Tarefa - Profissionais
CREATE TABLE IF NOT EXISTS `tarefa_profissionais` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tarefa_id` bigint(20) NOT NULL,
  `profissional_id` bigint(20) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tarefa_id` (`tarefa_id`),
  KEY `idx_profissional_id` (`profissional_id`),
  UNIQUE KEY `uk_tarefa_profissional` (`tarefa_id`, `profissional_id`),
  CONSTRAINT `fk_tarefa_profissionais_tarefa` FOREIGN KEY (`tarefa_id`) REFERENCES `tarefadiarias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tarefa_profissionais_profissional` FOREIGN KEY (`profissional_id`) REFERENCES `profissionais` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Condições Climáticas
CREATE TABLE IF NOT EXISTS `condicoes_climaticas` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `tarefa_id` bigint(20) NOT NULL,
  `periodo` enum('Manhã','Tarde','Noite') NOT NULL,
  `tempo` varchar(100),
  `condicao` varchar(100),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tarefa_id` (`tarefa_id`),
  KEY `idx_periodo` (`periodo`),
  UNIQUE KEY `uk_tarefa_periodo` (`tarefa_id`, `periodo`),
  CONSTRAINT `fk_condicoes_climaticas_tarefa` FOREIGN KEY (`tarefa_id`) REFERENCES `tarefadiarias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir Equipamentos Padrão
INSERT IGNORE INTO `equipamentos` (`nome`, `descricao`) VALUES
('Betoneira', 'Equipamento para misturar concreto'),
('Caminhão Basculante', 'Transporte de materiais'),
('Compactador de solo', 'Compactação de terreno'),
('Escavadeira', 'Escavação e movimentação de terra'),
('Guindaste', 'Elevação de cargas'),
('Picareta', 'Ferramenta manual de escavação'),
('Pá Carregadeira', 'Carregamento de materiais'),
('Retro Escavadeira', 'Escavação e limpeza');

-- Inserir Profissionais Padrão
INSERT IGNORE INTO `profissionais` (`nome`, `tipo`) VALUES
('Ajudante', 'Padrão'),
('Eletricista', 'Padrão'),
('Engenheiro', 'Padrão'),
('Estagiário', 'Padrão'),
('Gesseiro', 'Padrão'),
('Mestre de Obra', 'Padrão'),
('Pedreiro', 'Padrão'),
('Servente', 'Padrão'),
('Técnico em Edificações', 'Padrão');
