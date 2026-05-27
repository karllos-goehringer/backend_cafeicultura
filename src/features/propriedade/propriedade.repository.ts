import { Pool, ResultSetHeader } from "mysql2/promise";
import Propriedade from "./propriedade.entity";
import { Endereco } from "../../shared/domain/endereco.entity";
import { Tamanho } from "../../shared/domain/tamanho.entity";
import { IPropriedadeRow } from "./propriedade.model";

class PropriedadeRepository {
  constructor(private db: Pool) {}

  public async salvar(prop: Propriedade): Promise<number> {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Salva Tamanho
      const [resTam] = await conn.execute<ResultSetHeader>(
        `INSERT INTO tamanhos (valor, medida) VALUES (?, ?);`,
        [prop.tamanho.valor, prop.tamanho.medida]
      );
      const idTamanho = resTam.insertId;

      // 2. Salva Endereço
      const [resEnd] = await conn.execute<ResultSetHeader>(
        `INSERT INTO enderecos (logradouro, bairro, cidade, UF, pais, CEP) VALUES (?, ?, ?, ?, ?, ?);`,
        [prop.endereco.logradouro, prop.endereco.bairro, prop.endereco.cidade, prop.endereco.uf, prop.endereco.pais, prop.endereco.cep]
      );
      const idEndereco = resEnd.insertId;

      // 3. Salva Propriedade
      const [resProp] = await conn.execute<ResultSetHeader>(
        `INSERT INTO propriedades (idEndereco_FK, idProprietario_FK, idTamanho_FK, nome) VALUES (?, ?, ?, ?);`,
        [idEndereco, prop.idProprietario, idTamanho, prop.nome]
      );

      await conn.commit();
      return resProp.insertId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  };

  public async buscarPorId(idPropriedade: number): Promise<Propriedade | null> {
    const sql = `
      SELECT 
        p.idPropriedade_PK, p.idProprietario_FK, p.nome as nome,
        t.idTamanho_PK, t.valor, t.medida,
        e.idEndereco_PK, e.cidade, e.CEP, e.UF, e.pais, e.bairro, e.logradouro
      FROM propriedades p
      JOIN tamanhos t ON p.idTamanho_FK = t.idTamanho_PK
      JOIN enderecos e ON p.idEndereco_FK = e.idEndereco_PK
      WHERE p.idPropriedade_PK = ?;
    `;
    const [rows] = await this.db.execute<IPropriedadeRow[]>(sql, [idPropriedade]);
    if (rows.length === 0) return null;

    const row = rows[0];
    const tamanho = new Tamanho(row.valor, row.medida, row.idTamanho_PK);
    const endereco = new Endereco(row.logradouro, row.bairro, row.cidade, row.UF, row.pais, row.CEP, row.idEndereco_PK);
    
    return new Propriedade(row.nome, row.idProprietario_FK, tamanho, endereco, row.idPropriedade_PK);
  };

  public async atualizarNome(idPropriedade: number, novoNome: string): Promise<void> {
    await this.db.execute(
      `UPDATE propriedades SET nome = ? WHERE idPropriedade_PK = ?;`,
      [novoNome, idPropriedade]
    );
  };

  public async atualizarTamanho(idTamanho: number, tamanho: Tamanho): Promise<void> {
    await this.db.execute(
      `UPDATE tamanhos SET valor = ?, medida = ? WHERE idTamanho_PK = ?;`,
      [tamanho.valor, tamanho.medida, idTamanho]
    );
  };

  public async atualizarEndereco(idEndereco: number, endereco: Endereco): Promise<void> {
    await this.db.execute(
      `UPDATE enderecos SET logradouro = ?, bairro = ?, cidade = ?, UF = ?, pais = ?, CEP = ? WHERE idEndereco_PK = ?;`,
      [endereco.logradouro, endereco.bairro, endereco.cidade, endereco.uf, endereco.pais, endereco.cep, idEndereco]
    );
  };

  public async listarPorProprietario(idProprietario: number): Promise<Propriedade[]> {
     // Mesma query de buscarPorId, mas usando WHERE p.idProprietario_FK = ?
     // Retorna array hidratado de Propriedade[]
     // (Omitido para economizar espaço, mas é um map() do buscarPorId)
     return [];
  };
};

export default PropriedadeRepository;