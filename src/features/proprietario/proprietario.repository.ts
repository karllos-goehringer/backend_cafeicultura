import { Pool, ResultSetHeader } from "mysql2/promise";
import PessoaFisica from "../../shared/domain/pessoa/pessoafisica.entity";
import PessoaJuridica from "../../shared/domain/pessoa/pessoajuridica.entity";
import Pessoa from "../../shared/domain/pessoa/pessoa.entity";
import AuthRepository from "../auth/auth.repository";
import Proprietario from "./proprietario.entity";
import Credencial from "../auth/auth.entity";
import Endereco from "../../shared/domain/endereco/endereco.vo";

class ProprietarioRepository {
  constructor(private db: Pool, private authRepo: AuthRepository) {}
  public async salvarComTransacao(prop: Proprietario, cred: Credencial): Promise<number> {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO pessoas (dataCadastro) VALUES (?);`, [prop.perfil.dataCadastro]
      );
      const id = res.insertId;

      if (prop.tipoUser === "PF") {
        const pf = prop.perfil as PessoaFisica;
        await conn.execute(
          `INSERT INTO pessoasfisicas (idPeFisica_PFK, nome, cpf) VALUES (?, ?, ?);`,
          [id, pf.nomeExibicao, pf.cpf]
        );
      } else {
        const pj = prop.perfil as PessoaJuridica;
        await conn.execute(
          `INSERT INTO pessoasjuridicas (idPeJuridica_PFK, razaoSocial, cnpj, inscEstadual) VALUES (?, ?, ?, ?);`,
          [id, pj.razaoSocial, pj.cnpj, pj.inscricaoEstadual || null]
        );
      };

      await conn.execute(`INSERT INTO proprietarios (idProprietario_PFK) VALUES (?);`, [id]);
      await this.authRepo.salvarCredencial(cred, id, conn);
      await conn.commit();
      return id;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
  public async cadastrarEndereco(enderecoData: Endereco, pessoaId: number): Promise<number> {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();
      const [res] = await conn.execute<ResultSetHeader>(
        `INSERT INTO enderecos (idEndereco, cidade, bairro, CEP, UF, pais, logradouro) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [pessoaId, enderecoData.cidade, enderecoData.bairro, enderecoData.CEP, enderecoData.UF, enderecoData.pais, enderecoData.logradouro]
      );
      await conn.commit();
      return pessoaId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  public async buscarPorId(id: number): Promise<Proprietario | null> {
    const sql = `
      SELECT 
        u.idUsuario_PFK, u.email, u.telefone, u.senha, p.dataCadastro,
        pf.nome, pf.cpf,
        pj.razaoSocial, pj.cnpj, pj.inscEstadual,
        e.idEndereco, e.cidade, e.bairro, e.CEP, e.UF, e.pais, e.logradouro
      FROM proprietarios pr
      INNER JOIN usuarios u ON pr.idProprietario_PFK = u.idUsuario_PFK
      INNER JOIN pessoas p ON u.idUsuario_PFK = p.idPessoa_PK
      LEFT JOIN pessoasfisicas pf ON p.idPessoa_PK = pf.idPeFisica_PFK
      LEFT JOIN pessoasjuridicas pj ON p.idPessoa_PK = pj.idPeJuridica_PFK
      LEFT JOIN enderecos e ON p.idPessoa_PK = e.idEndereco
      WHERE pr.idProprietario_PFK = ?;
    `;

    const [rows] = await this.db.execute<any[]>(sql, [id]);
    if (rows.length === 0) return null;

    const row = rows[0];

    // 1. Reconstituir Endereço (se houver)
    const endereco = row.idEndereco 
      ? new Endereco(row.idEndereco, row.cidade, row.bairro, row.CEP, row.UF, row.pais, row.logradouro)
      : undefined;

    // 2. Determinar se é PF ou PJ para criar o Perfil
    let perfil: Pessoa;
    if (row.cpf) {
      perfil = new PessoaFisica(row.nome, row.cpf, row.dataCadastro, row.idUsuario_PFK, endereco);
    } else {
      perfil = new PessoaJuridica(row.razaoSocial, row.cnpj, row.inscEstadual, row.dataCadastro, row.idUsuario_PFK, endereco);
    }

    // 3. Retornar a entidade proprietário completa
    return new Proprietario(perfil, row.email, row.telefone, row.senha);
  }

  public async removerEndereco(pessoaId: number): Promise<void> {
    // Como o idEndereco é o mesmo id da pessoa, a deleção é direta
    await this.db.execute(`DELETE FROM enderecos WHERE idEndereco = ?;`, [pessoaId]);
  }

  public async excluir(id: number): Promise<void> {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      // Exclusão em ordem reversa à criação para respeitar Constraints de FK
      // Remove o vínculo de proprietário
      await conn.execute(`DELETE FROM proprietarios WHERE idProprietario_PFK = ?;`, [id]);
      // Remove as credenciais e dados de usuário
      await conn.execute(`DELETE FROM usuarios WHERE idUsuario_PFK = ?;`, [id]);
      // Remove o endereço associado
      await conn.execute(`DELETE FROM enderecos WHERE idEndereco = ?;`, [id]);
      // Remove das tabelas de especialização (tenta em ambas, pois o ID é único)
      await conn.execute(`DELETE FROM pessoasfisicas WHERE idPeFisica_PFK = ?;`, [id]);
      await conn.execute(`DELETE FROM pessoasjuridicas WHERE idPeJuridica_PFK = ?;`, [id]);
      // Por fim, remove da tabela base
      await conn.execute(`DELETE FROM pessoas WHERE idPessoa_PK = ?;`, [id]);

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
  public async atualizarEndereco(enderecoData: Endereco, pessoaId: number): Promise<void> {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE enderecos SET cidade = ?, bairro = ?, CEP = ?, UF = ?, pais = ?, logradouro = ? WHERE idEndereco = ?;`,
        [enderecoData.cidade, enderecoData.bairro, enderecoData.CEP, enderecoData.UF, enderecoData.pais, enderecoData.logradouro, pessoaId]
      );
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
  public async atualizarProprietario(proprietario: Proprietario): Promise<void> {
    const conn = await this.db.getConnection();
    try {
      await conn.beginTransaction();

      const id = proprietario.idPessoa;

      if (!id) {
        throw new Error("ID do proprietário não encontrado para atualização.");
      }

      await conn.execute(
        `UPDATE usuarios SET email = ?, telefone = ?, senha = ? WHERE idUsuario_PFK = ?;`,
        [proprietario.email, proprietario.telefone, proprietario.credencial.senha, id]
      );

      if (proprietario.tipoUser === "PF") {
        const pf = proprietario.perfil as PessoaFisica;
        await conn.execute(
          `UPDATE pessoasfisicas SET nome = ?, cpf = ? WHERE idPeFisica_PFK = ?;`,
          [pf.nomeExibicao, pf.cpf, id]
        );
      } else {
        const pj = proprietario.perfil as PessoaJuridica;
        await conn.execute(
          `UPDATE pessoasjuridicas SET razaoSocial = ?, cnpj = ?, inscEstadual = ? WHERE idPeJuridica_PFK = ?;`,
          [pj.razaoSocial, pj.cnpj, pj.inscricaoEstadual || null, id]
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}

export default ProprietarioRepository;