CREATE TABLE candidatos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    numero INT NOT NULL UNIQUE
);


CREATE TABLE votos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    id_candidato INT NOT NULL,
    FOREIGN KEY (id_candidato) REFERENCES candidatos(id)
);


INSERT INTO candidatos (nome, numero) VALUES 
('Denise', 10),
('Hamilcar', 20),
('Ricardo', 50),
('Maicon', 23),
('Lilian', 15),
('Rafaelly', 33);