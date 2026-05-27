class Endereco{
    private _idEndereco: number;
    private _cidade: string;
    private _bairro: string;
    private _CEP: string;
    private _UF: string;
    private _pais: string;
    private _logradouro: string;

    constructor(idEndereco: number,cidade: string, bairro: string, CEP: string, UF: string, pais: string, logradouro: string){
        this._idEndereco = idEndereco;
        this._cidade = cidade;
        this._bairro = bairro;
        this._CEP = CEP;
        this._UF = UF;
        this._pais = pais;
        this._logradouro = logradouro;
    }
    public get idEndereco(): number {
        return this._idEndereco;
    }
    public get cidade(): string{
        return this._cidade;
    }
    public get bairro(): string{
        return this._bairro;
    }
    public get CEP(): string{
        return this._CEP;
    }
    public get UF(): string{
        return this._UF;
    }
    public get pais(): string{
        return this._pais;
    }
    public get logradouro(): string{
        return this._logradouro;
    }
    public toJSON(){
        return {
            cidade: this._cidade,
            bairro: this._bairro,
            CEP: this._CEP,
            UF: this._UF,
            pais: this._pais,
            logradouro: this._logradouro
        }
    }
    public toString(){
        return `Cidade: ${this._cidade}\
        Bairro: ${this._bairro}\n
        CEP: ${this._CEP}\n
        UF: ${this._UF}\n
        País: ${this._pais}\n
        Logradouro: ${this._logradouro}`
    }
}
export default Endereco;
