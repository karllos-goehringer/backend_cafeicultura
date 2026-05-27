import { Endereco } from "../../shared/domain/endereco.entity";
import { Tamanho } from "../../shared/domain/tamanho.entity";

export type CreatePropriedadeDTO = {
  nome: string;
  tamanho: Tamanho;
  endereco: Endereco;
};

export type PropriedadeResponseDTO = {
  id: number | undefined;
  nome: string;
  tamanho: Tamanho;
  endereco: Endereco;
};

export type UpdateNomePropriedadeDTO = {
  nome: string;
}

export type UpdateTamanhoPropriedadeDTO = {
  tamanho: Tamanho;
}

export type UpdateEnderecoPropriedadeDTO = {
  endereco: Endereco;
}