CREATE TABLE `atividades` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`titulo` text,
	`descricao` text,
	`inicio` date,
	`fim` date,
	`projeto_id` bigint,
	CONSTRAINT `atividades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orcamento` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`descricao` varchar(255),
	`unidade` varchar(50),
	`qtde` smallint,
	`unitario_mao_obra` float,
	`total_mao_obra` double,
	`total` double,
	`sub_atividade_id` bigint,
	CONSTRAINT `orcamento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projetos` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`nome` varchar(255),
	CONSTRAINT `projetos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subatividades` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`titulo` text,
	`descricao` text,
	`inicio` date,
	`fim` date,
	`status` tinyint,
	`finalizado` tinyint DEFAULT 0,
	`atividade_id` bigint,
	`metragem` bigint,
	`realizado` bigint,
	CONSTRAINT `subatividades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tarefadiarias` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`descricao` text,
	`subatividade_id` bigint,
	`realizado` bigint,
	`data` date,
	CONSTRAINT `tarefadiarias_id` PRIMARY KEY(`id`)
);
