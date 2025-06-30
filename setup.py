import os
import sys
import subprocess
import shutil

def setupEnv():
    print("Setting up the environment...")
    env_path = os.path.join(os.getcwd(), 'servidor-tunel', '.env')
    if not os.path.exists(env_path):
        example_path = os.path.join(os.getcwd(), 'servidor-tunel', '.env.example')
        if os.path.exists(example_path):
            with open(example_path, 'r') as example_file:
                content = example_file.read()
            with open(env_path, 'w') as env_file:
                env_file.write(content)
            print(".env file created from .env.example")
        else:
            print("No .env.example file found to create .env")
    else:
        print(".env file already exists")
        os.path.join(os.getcwd(), '../')
        return
    
    host = input("DB_HOST (default: localhost): ") or "localhost"
    port = input("DB_PORT (default: 3306): ") or "3306"
    user = input("DB_USER (default: root): ") or "root"
    password = input("DB_PASSWORD (default: <vazio>): ") or ""
    database = input("DB_NAME (default: tunz): ") or "tunz"

    JWT_SECRET = input("JWT_SECRET (required): ")
    if not JWT_SECRET:
        print("JWT_SECRET is required. Exiting setup.")
        os.path.join(os.getcwd(), '../')
        return
    
    JWT_EXPIRATION = input("JWT_EXPIRES_IN (default: 24h): ") or "24h"

    PORT = input("PORT (default: 3000): ") or "3000"
    NODE_ENV = input("NODE_ENV (default: development): ") or "development"
    ADMIN_EMAIL = input("ADMIN_EMAIL (default: admin@seudominio.com): ") or "admin@seudominio.com"
    ADMIN_PASSWORD = input("ADMIN_PASSWORD (default: admin): ") or "admin"

    # Coletar configurações SMTP apenas para produção
    if NODE_ENV == "production":
        SMTP_HOST = input("SMTP_HOST (default: smtp.gmail.com): ") or "smtp.gmail.com"
        SMTP_PORT = input("SMTP_PORT (default: 587): ") or "587"
        SMTP_SECURE = input("SMTP_SECURE (default: false): ") or "false"
        SMTP_USER = input("SMTP_USER (required): ")
        if not SMTP_USER:
            print("SMTP_USER is required. Exiting setup.")
            os.path.join(os.getcwd(), '../')
            return
        SMTP_PASSWORD = input("SMTP_PASSWORD (required): ")
        if not SMTP_PASSWORD:
            print("SMTP_PASSWORD is required. Exiting setup.")
            os.path.join(os.getcwd(), '../')
            return
    else:
        # Valores padrão para desenvolvimento
        SMTP_HOST = "smtp.gmail.com"
        SMTP_PORT = "587"
        SMTP_SECURE = "false"
        SMTP_USER = ""
        SMTP_PASSWORD = ""

    # Ler o conteúdo atual do arquivo
    with open(env_path, 'r') as env_file:
        content = env_file.read()

    # Fazer todas as substituições
    content = content.replace('DB_HOST=localhost', f'DB_HOST={host}')
    content = content.replace('DB_PORT=3306', f'DB_PORT={port}')
    content = content.replace('DB_USER=root', f'DB_USER={user}')  
    content = content.replace('DB_PASSWORD=', f'DB_PASSWORD={password}')
    content = content.replace('DB_NAME=tunz', f'DB_NAME={database}')
    content = content.replace('JWT_SECRET=', f'JWT_SECRET={JWT_SECRET}')
    content = content.replace('JWT_EXPIRES_IN=24h', f'JWT_EXPIRES_IN={JWT_EXPIRATION}')
    content = content.replace('PORT=3000', f'PORT={PORT}')
    content = content.replace('NODE_ENV=development', f'NODE_ENV={NODE_ENV}')
    content = content.replace('ADMIN_EMAIL=admin@seudominio.com', f'ADMIN_EMAIL={ADMIN_EMAIL}')
    content = content.replace('ADMIN_PASSWORD=admin', f'ADMIN_PASSWORD={ADMIN_PASSWORD}')
    
    # Configurações SMTP (sempre substituir, mesmo se vazias para desenvolvimento)
    content = content.replace('SMTP_HOST=smtp.gmail.com', f'SMTP_HOST={SMTP_HOST}')
    content = content.replace('SMTP_PORT=587', f'SMTP_PORT={SMTP_PORT}')
    content = content.replace('SMTP_SECURE=false', f'SMTP_SECURE={SMTP_SECURE}')
    content = content.replace('SMTP_USER=seu_email@seudominio.com', f'SMTP_USER={SMTP_USER}')
    content = content.replace('SMTP_PASS=sua_senha_email', f'SMTP_PASS={SMTP_PASSWORD}')

    # Escrever o conteúdo modificado de volta no arquivo
    with open(env_path, 'w') as env_file:
        env_file.write(content)
    
    print("Environment configuration completed successfully!")
    print(f"Configuration saved to: {env_path}")

    os.path.join(os.getcwd(), '../')


def setupNodeModulesServer():
    print("Setting up Node.js modules for the server...")
    server_path = os.path.join(os.getcwd(), 'servidor-tunel')
    node_modules = server_path + '/node_modules'
    if os.path.exists(node_modules):
        print(f"Node.js modules already exist in {node_modules}. Skipping installation.")
        return
    if not os.path.exists(server_path):
        print(f"Server directory {server_path} does not exist.")
        return
    os.chdir(server_path)
    os.system('npm install')
    print("Node.js modules for the server have been set up.")

def setupNodeModulesClient():
    print("Setting up Node.js modules for the client...")
    client_path = os.path.join(os.getcwd(), 'cliente-tunz')
    node_modules = client_path + '/node_modules'
    if os.path.exists(node_modules):
        print(f"Node.js modules already exist in {node_modules}. Skipping installation.")
        return
    if not os.path.exists(client_path):
        print(f"Client directory {client_path} does not exist.")
        return
    os.chdir(client_path)
    os.system('npm install')
    print("Node.js modules for the client have been set up.")
    os.path.join(os.getcwd(), '../')

def setupDatabase():
    print("Setting up the database...")
    server_path = os.path.join(os.getcwd(), 'servidor-tunel')
    try:
        print("Running database setup...")
        subprocess.run(['npm', 'run', 'setup'], cwd=server_path, shell=True)
        print("Database setup completed successfully!")
        return True
    except Exception as e:
        print(f"❌ Error during database setup: {str(e)}")
        return False
    
    

def setupClientBinary():
    print("Setting up client binary...")
    
    # Navegar para o diretório do cliente
    client_path = os.path.join(os.getcwd(), 'cliente-tunz')

    binary_file = client_path + '/dist/tunz.exe'
    if os.path.exists(binary_file):
        print(f"Client binary already exists at {binary_file}. Skipping setup.")
        return

    if not os.path.exists(client_path):
        print(f"Client directory {client_path} does not exist.")
        return False
    
    compiler_path = os.path.join(client_path, 'main.py')
    if not os.path.exists(compiler_path):
        print(f"Compiler script {compiler_path} does not exist.")
        return False
    
    try:
        print("📝 Step 1: Configuring client...")
        result = subprocess.run(
            ['python', 'main.py', '--configure'], 
            cwd=client_path,
            capture_output=False,
            text=True
        )
        if result.returncode != 0:
            print("❌ Configuration failed.")
            return False
        
        print("🧪 Step 2: Testing configuration...")
        result = subprocess.run(
            ['python', 'main.py', '--test'], 
            cwd=client_path,
            capture_output=False,
            text=True
        )
        if result.returncode != 0:
            print("⚠️ Test failed, but continuing...")
        
        print("🔨 Step 3: Building client binary...")
        result = subprocess.run(
            ['python', 'main.py', '--build'], 
            cwd=client_path,
            capture_output=False,
            text=True
        )
        if result.returncode != 0:
            print("❌ Build failed.")
            return False
        
        print("✅ Client binary setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error during client binary setup: {str(e)}")
        return False


def help():
    print("Version: 1.0.0")
    print("Usage: python setup.py [options]")
    print("Options:")
    print("  --setup, -s     Setup the complete environment")
    print("                  • Configure .env file")
    print("                  • Install server dependencies")
    print("                  • Install client dependencies")
    print("                  • Configure and build client binary")
    print("  --help, -h      Show this help message")
    print("  --version, -v   Show the version of the script")
    print("  --clean, -c     Clean the environment")
    print()
    print("The --setup option performs these steps:")
    print("  1. Configure database and server settings")
    print("  2. Install Node.js modules for server")
    print("  3. Install Node.js modules for client")
    print("  4. Configure client server URL")
    print("  5. Test client configuration")
    print("  6. Build client executable (tunz.exe)")

def clean():
    print("Cleaning the environment...")
    server_path = os.path.join(os.getcwd(), 'servidor-tunel')
    client_path = os.path.join(os.getcwd(), 'cliente-tunz')
    node_modules_server = server_path + '/node_modules'
    if os.path.exists(node_modules_server):
        subprocess.run(['npm', 'run', 'db:drop'], cwd=server_path, shell=True)
        print(f"Removing Node.js modules from server: {node_modules_server}")
        shutil.rmtree(node_modules_server, ignore_errors=True)
    env = server_path + '/.env'
    if os.path.exists(env):
        print(f"Removing environment file: {env}")
        os.remove(env)
    node_modules_client = client_path + '/node_modules'
    if os.path.exists(node_modules_client):
        print(f"Removing Node.js modules from client: {node_modules_client}")
        shutil.rmtree(node_modules_client, ignore_errors=True)
    dist_client = client_path + '/dist'
    if os.path.exists(dist_client):
        print(f"Removing client distribution directory: {dist_client}")
        shutil.rmtree(dist_client, ignore_errors=True)
    


def main():
    argv = sys.argv[1:]
    if len(argv) < 1:
        help()
        return
    if argv[0] in ('--setup', '-s'):
        setupEnv()
        setupNodeModulesServer()
        setupNodeModulesClient()
        if(os.getcwd != "C:\\Users\\corte\\Documents\\projetos\\node\\tunel_server"):
            os.chdir(os.path.join(os.getcwd(), '../'))
        setupDatabase()
        setupClientBinary()
        if(os.getcwd != "C:\\Users\\corte\\Documents\\projetos\\node\\tunel_server"):
            os.chdir(os.path.join(os.getcwd(), '../'))
        test_bynary = input("Do you want to test the client binary? (yes/no): ").strip().lower()
        if test_bynary == 'yes' or test_bynary == 'y':
            binary_path = os.getcwd() + '/cliente-tunz/dist/tunz.exe --version'
            print(f"Testing client binary at: {binary_path}")
            result = subprocess.run(binary_path, shell=True, capture_output=True, text=True)
            if result.returncode == 0:
                print("Client binary test successful!")
                print(result.stdout)
            else:
                print("Client binary test failed.")
                print(result.stderr)
        
        run_server = input("Do you want to run the server now? (yes/no): ").strip().lower()
        if run_server == 'yes' or run_server == 'y':
            server_path = os.path.join(os.getcwd(), 'servidor-tunel')
            print("Starting the server...")
            try:
                subprocess.run(['npm', 'run', 'dev'], cwd=server_path, shell=True, check=True)
            except subprocess.CalledProcessError as e:
                print(f"❌ Failed to start server: {e}")
            except Exception as e:
                print(f"❌ Error starting server: {e}")
        else:
            print("Server not started. You can start it later by running 'npm run dev' in the servidor-tunel directory.")

    elif argv[0] in ('--clean', '-c'):
        clean()


if __name__ == "__main__":
    main()