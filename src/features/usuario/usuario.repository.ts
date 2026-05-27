import { Pool } from "mysql2/promise";
import { IUsuarioRow } from "./usuario.model";
import Usuario from "./usuario.entity";
import Endereco from "../../shared/domain/endereco/endereco.vo";

/**
 * Repositório para a entidade Usuario.
 * Centraliza o acesso ao banco de dados para operações de leitura e persistência de usuários.
 */
export default class UsuarioRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Busca um usuário completo pelo seu ID.
   * Realiza JOIN com as tabelas de pessoas, endereços e documentos.
   */
  public async buscarPorId(id: number): Promise<Usuario | null> {
    const sql = `
      SELECT 
        u.idUsuario_PFK, u.email, u.telefone, u.senha, u.dataCadastro,
        COALESCE(pf.nome, pj.razaoSocial) AS nomeExibicao,
        e.idEndereco, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado, e.cep,
        (
          SELECT GROUP_CONCAT(doc.numero) 
          FROM documentos doc 
          WHERE doc.idPessoa_FK = u.idUsuario_PFK
        ) AS documentos
      FROM usuarios u
      INNER JOIN pessoas p ON u.idUsuario_PFK = p.idPessoa_PK
      LEFT JOIN pessoasfisicas pf ON p.idPessoa_PK = pf.idPeFisica_PFK
      LEFT JOIN pessoasjuridicas pj ON p.idPessoa_PK = pj.idPeJuridica_PFK
      LEFT JOIN enderecos e ON p.idPessoa_PK = e.idPessoa_FK
      WHERE u.idUsuario_PFK = ?;
    `;

    const [rows] = await this.pool.execute<IUsuarioRow[]>(sql, [id]);

    if (rows.length === 0) return null;

    return this.mapRowToEntity(rows[0]);
  }

  /**
   * Mapeia os dados brutos do banco (Row) para a instância da Entidade.
   */
  private mapRowToEntity(row: IUsuarioRow): Usuario {
    const endereco = row.logradouro
      ? new Endereco(
          row.idEndereco!, 
          row.cidade || "",
          row.bairro || "",
          row.cep || "",
          row.estado || "",
          "Brasil", // Assumindo padrão ou vindo de outra fonte
          row.logradouro || ""
        )
      : undefined;

    // Converte a string concatenada do GROUP_CONCAT em um array de strings
    const documentos = row.documentos ? row.documentos.split(",") : [];

    // Reconstitui a entidade Usuario através do construtor
    return new Usuario(
      row.email,
      row.telefone,
      row.senha || "",
      documentos,
      row.nomeExibicao,
      row.idUsuario_PFK,
      row.dataCadastro,
      endereco
    );
  }
}