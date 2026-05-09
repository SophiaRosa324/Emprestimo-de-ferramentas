import os

# Configurações
pasta_projeto = '.' 
arquivo_saida = 'backend_completo.txt'
# Adicione ou remova extensões conforme seu backend (ex: .java, .go, .php)
extensoes_validas = ('.js', '.ts', '.py', '.json', '.env.example', '.sql', '.md')
# Pastas que NÃO devem ser lidas
pastas_ignoradas = {'node_modules', '__pycache__', '.git', 'venv', '.next', 'dist', 'build'}

with open(arquivo_saida, 'w', encoding='utf-8') as outfile:
    for raiz, pastas, arquivos in os.walk(pasta_projeto):
        # Filtra pastas ignoradas para não entrar nelas
        pastas[:] = [d for d in pastas if d not in pastas_ignoradas]
        
        for nome_arquivo in arquivos:
            if nome_arquivo.endswith(extensoes_validas):
                caminho_completo = os.path.join(raiz, nome_arquivo)
                
                # Cabeçalho para identificar de qual subpasta o código veio
                outfile.write(f"\n\n{'='*50}\n")
                outfile.write(f"CAMINHO: {caminho_completo}\n")
                outfile.write(f"{'='*50}\n\n")
                
                try:
                    with open(caminho_completo, 'r', encoding='utf-8') as infile:
                        outfile.write(infile.read())
                except Exception as e:
                    outfile.write(f"[ERRO AO LER ARQUIVO]: {e}\n")

print(f"Sucesso! Todo o backend foi reunido em: {arquivo_saida}")
