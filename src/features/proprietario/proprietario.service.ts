import ProprietarioRepository from "./proprietario.repository";
import Proprietario from "./proprietario.entity";
import Credencial from "../auth/auth.entity";
import PessoaFisica from "../../shared/domain/pessoa/pessoafisica.entity";
import PessoaJuridica from "../../shared/domain/pessoa/pessoajuridica.entity";
import Pessoa from "../../shared/domain/pessoa/pessoa.entity";
import { CreateProprietarioDTO, ReturnProprietarioDTO, UpdateProprietarioDTO } from "./proprietario.dto";
import Endereco from "../../shared/domain/endereco/endereco.vo";

export default class ProprietarioService {
  constructor(private repo: ProprietarioRepository) {}

  public async cadastrar(dados: CreateProprietarioDTO): Promise<number> {
    // 1. Determinar e instanciar o perfil (PF ou PJ)
    let perfil: Pessoa;
    if (dados.tipoPessoa === "fisica") {
      perfil = new PessoaFisica(dados.nome!, dados.cpf!);
    } else if (dados.tipoPessoa === "juridica") {
      perfil = new PessoaJuridica(dados.razaoSocial!, dados.cnpj!, dados.inscrEstadual);
    } else {
      throw new Error("Tipo de pessoa inválido.");
    }
    // instanciar credencial
    const credencial = new Credencial(dados.email, dados.telefone, dados.senha);
    await credencial.criptografarSenha();
    const proprietario = new Proprietario(
      perfil,
      credencial.email,
      credencial.telefone,
      credencial.senha
    );
    return await this.repo.salvarComTransacao(proprietario, credencial);
  }

  public async buscarPorId(id: number): Promise<ReturnProprietarioDTO | null> {
    const proprietario = await this.repo.buscarPorId(id);
    if (!proprietario) return null;

    return {
      id: proprietario.idPessoa!,
      nomeExibicao: proprietario.nomeExibicao,
      tipoPessoa: proprietario.tipoUser,
      email: proprietario.email,
      telefone: proprietario.telefone,
      documentos: proprietario.documentos || [],
      dataCadastro: proprietario.perfil.dataCadastro,
      endereco: proprietario.endereco
        ? {
            idEndereco: proprietario.endereco.idEndereco || 0,
            cidade: proprietario.endereco.cidade,
            bairro: proprietario.endereco.bairro,
            CEP: proprietario.endereco.CEP,
            UF: proprietario.endereco.UF,
            pais: proprietario.endereco.pais,
            logradouro: proprietario.endereco.logradouro,
          }
        : undefined,
    };
  }

  public async criarEndereco(dados: any, pessoaId: number): Promise<number> {
    const endereco = new Endereco(
      pessoaId, // O ID será o próprio pessoaId no banco
      dados.cidade,
      dados.bairro,
      dados.cep || dados.CEP,
      dados.uf || dados.UF,
      dados.pais || "Brasil",
      dados.logradouro
    );
    return await this.repo.cadastrarEndereco(endereco, pessoaId);
  }

  public async removerEndereco(pessoaId: number): Promise<void> {
    await this.repo.removerEndereco(pessoaId);
  }

  public async excluir(id: number): Promise<void> {
    const proprietario = await this.repo.buscarPorId(id);
    if (!proprietario) {
      throw new Error("Proprietário não encontrado para exclusão.");
    }
    if (proprietario.endereco) {
      await this.repo.removerEndereco(id);
    }
    await this.repo.excluir(id);
  }
  
  public async atualizar(id: number, dados: UpdateProprietarioDTO): Promise<void> {
    const existente = await this.repo.buscarPorId(id);
    if (!existente) {
      throw new Error("Proprietário não encontrado para atualização.");
    }

    // 1. Preparar credenciais (tratar senha se fornecida)
    let senhaFinal = existente.credencial.senha;
    if (dados.senha) {
      const cred = new Credencial(dados.email || existente.email, dados.telefone || existente.telefone, dados.senha);
      await cred.criptografarSenha();
      senhaFinal = cred.senha;
    }

    // 2. Atualizar Perfil (PF ou PJ)
    let perfil: Pessoa;
    if (existente.tipoUser === "PF") {
      const pfAtual = existente.perfil as PessoaFisica;
      perfil = new PessoaFisica(
        dados.nome ?? pfAtual.nomeExibicao,
        pfAtual.cpf,
        pfAtual.dataCadastro,
        id,
        pfAtual.endereco
      );
    } else {
      const pjAtual = existente.perfil as PessoaJuridica;
      perfil = new PessoaJuridica(
        dados.razaoSocial ?? pjAtual.razaoSocial,
        pjAtual.cnpj,
        dados.inscrEstadual ?? pjAtual.inscricaoEstadual,
        pjAtual.dataCadastro,
        id,
        pjAtual.endereco
      );
    }

    const proprietarioAtualizado = new Proprietario(
      perfil,
      dados.email ?? existente.email,
      dados.telefone ?? existente.telefone,
      senhaFinal
    );

    await this.repo.atualizarProprietario(proprietarioAtualizado);
  }

  public async atualizarEndereco(pessoaId: number, dados: any): Promise<void> {
    const endereco = new Endereco(
      pessoaId,
      dados.cidade,
      dados.bairro,
      dados.cep || dados.CEP,
      dados.uf || dados.UF,
      dados.pais || "Brasil",
      dados.logradouro
    );
    await this.repo.atualizarEndereco(endereco, pessoaId);
  }
}