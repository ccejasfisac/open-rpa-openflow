import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import * as jsonwebtoken from "jsonwebtoken";
import { Base } from "./base";
import { TokenUser } from "./TokenUser";
import { User } from "./User";
import { Config } from "./Config";
import { Util } from "./Util";

export class Crypt {
    static encryption_key: string = Config.aes_secret.substr(0, 32); // must be 256 bytes (32 characters)
    static iv_length: number = 16; // for AES, this is always 16
    static bcrypt_salt_rounds: number = 12;

    static encrypt(text: string): string {
        let iv: Buffer = crypto.randomBytes(Crypt.iv_length);
        let cipher: crypto.Cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(Crypt.encryption_key), iv);
        let encrypted: Buffer = cipher.update((text as any));
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString("hex") + ":" + encrypted.toString("hex");
    }

    static decrypt(text: string): string {
        let textParts: string[] = text.split(":");
        let iv: Buffer = Buffer.from(textParts.shift(), "hex");
        let encryptedText: Buffer = Buffer.from(textParts.join(":"), "hex");
        let decipher: crypto.Decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(Crypt.encryption_key), iv);
        let decrypted: Buffer = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }

    static async hash(password: string): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            try {
                bcrypt.hash(password, Crypt.bcrypt_salt_rounds, async (error, hash) => {
                    if (error) { return reject(error); }
                    resolve(hash);
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    static async compare(password: string, passwordhash: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                if (Util.IsNullEmpty(password)) { return reject("Password cannot be empty"); }
                if (Util.IsNullEmpty(passwordhash)) { return reject("Passwordhash cannot be empty"); }
                bcrypt.compare(password, passwordhash, async (error, res) => {
                    if (error) { return reject(error); }
                    resolve(res);
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    static createToken(item: User | TokenUser, expiresIn: string): string {
        var user: TokenUser = new TokenUser(item);
        var token: string = jsonwebtoken.sign({ data: user }, Crypt.encryption_key,
            { expiresIn: expiresIn }); // 60 (seconds), "2 days", "10h", "7d"
        return token;
    }
    static verityToken(token: string): TokenUser {
        var o: any = jsonwebtoken.verify(token, Crypt.encryption_key);
        o.data = TokenUser.assign(o.data);
        return o.data;
    }
    static decryptToken(token: string): any {
        var o: any = jsonwebtoken.verify(token, Crypt.encryption_key);
        return o;
    }
}