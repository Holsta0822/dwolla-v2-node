import formUrlEncoded from "form-urlencoded";
import fetch, { Response } from "node-fetch";
import { Client } from "./client";
import { Token } from "./token";
import { userAgent } from "./utils";

export interface AuthError extends Error {
    error: string;
}

export interface AuthResponse {
    accessToken: string;
    error?: string;
    expiresIn: number;
    tokenType: string;
}

export interface AuthRequestParams {
    [key: string]: string;
}

export class Auth {
    readonly #client: Client;

    constructor(client: Client) {
        this.#client = client;
    }

    async requestToken(params?: AuthRequestParams): Promise<Token> {
        const rawResponse: Response = await fetch(this.#client.environment.tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": userAgent()
            },
            body: formUrlEncoded(
                Object.assign(
                    {
                        client_id: this.#client.options.id || this.#client.options.key,
                        client_secret: this.#client.options.secret,
                        grant_type: "client_credentials"
                    },
                    params
                )
            )
        });

        // When the HTTP response is received, remap the snake_case that the API returns
        // to Typescript-preferred camelCase that match our interface property keys..
        const jsonResponse: AuthResponse = this.#mapResponse<AuthResponse>(await rawResponse.json(), {
            access_token: "accessToken",
            expires_in: "expiresIn",
            token_type: "tokenType"
        });

        if (jsonResponse.error) {
            const authError: AuthError = new Error(JSON.stringify(jsonResponse)) as AuthError;
            authError.error = jsonResponse.error;
            throw authError;
        }
        return Token.fromResponse(this.#client, jsonResponse);
    }

    #mapResponse<T extends { [x: string]: any }>(body: any, mapper: Partial<Record<string, keyof T>>): T {
        const response: T = {} as T;
        Object.keys(body).map((x: string) => (response[mapper[x] as keyof T] = body[x]));
        return response;
    }
}
