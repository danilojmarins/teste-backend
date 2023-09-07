declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: number;
            MYSQL_HOST: string;
            MYSQL_USER: string;
            MYSQL_PASSWORD: string;
            MYSQL_PORT: number;
            MYSQL_DATABASE: string;
        }
    }
}

export {};