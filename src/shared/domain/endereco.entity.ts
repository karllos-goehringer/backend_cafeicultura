export class Endereco {
  private _logradouro: string;
  private _bairro: string;
  private _cidade: string;
  private _uf: string;
  private _pais: string;
  private _cep: string;
  private _id?: number;
  constructor(
    logradouro: string,
    bairro: string,
    cidade: string,
    uf: string,
    pais: string,
    cep: string,
    id?: number,
  ) {
    this.validarLogradouro(logradouro);
    this._logradouro = logradouro;

    this.validarBairro(bairro);
    this._bairro = bairro;

    this.validarCidade(cidade);
    this._cidade = cidade;

    this.validarUF(uf);
    this._uf = uf;

    this.validarPais(pais);
    this._pais = pais;

    this.validarCEP(cep);
    this._cep = cep;

    this._id = id;
  };

  public get id(): number | undefined {
    return this._id;
  };
  public get logradouro(): string {
    return this._logradouro;
  };
  public get bairro(): string {
    return this._bairro;
  };
  public get cidade(): string {
    return this._cidade;
  };
  public get uf(): string {
    return this._uf;
  };
  public get pais(): string {
    return this._pais;
  };
  public get cep(): string {
    return this._cep;
  };

  private validarLogradouro(logradouro: string) {
    if (logradouro.length < 5)
      throw new Error("Logradouro deve conter pelo menos 5 letras.");
  };

  private validarBairro(bairro: string) {
    if (bairro.length < 4)
      throw new Error("Bairro deve conter pelo menos 4 letras.");
  };

  private validarCidade(cidade: string) {
    if (cidade.length < 4)
      throw new Error("Cidade deve conter pelo menos 4 letras.");
  };

  private validarUF(uf: string) {
    if (uf.length !== 2)
      throw new Error("A UF deve conter exatamente 2 caracteres.");
  }

  private validarPais(pais: string) {
    if (pais.length < 4)
      throw new Error("Pais deve conter pelo menos 4 letras.");
  };

  private validarCEP(cep: string) {
    const cepRegex = /^\d{5}-\d{3}$/;
    if (!cepRegex.test(cep))
      throw new Error("CEP deve estar no formato 00000-000.");
  };

  public toJSON() {
    return {
      cidade: this._cidade,
      cep: this._cep,
      uf: this._uf,
      pais: this._pais,
      bairro: this._bairro,
      logradouro: this._logradouro,
    };
  };
}
