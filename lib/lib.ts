import { resolve, basename } from "path";
import fs from "fs";
import parseEnv from "parse-dotenv";

const ENV_PATH = resolve(process.cwd(), ".env");
const DEFAULT_EXAMPLE_ENV_FILENAME = ".env.example";

interface EnvObject {
	[key: string]: any;
}

export const fileExists = (path: string) => fs.existsSync(path);

export const getObjKeys = (obj: object) => Object.keys(obj);

export const envToString = (parsed: EnvObject) =>
	getObjKeys(parsed)
		.map(key => `${key}=${parsed[key] || ""}`)
		.join("\r\n")
		.replace(/(__\w+_\d__=)/g, "");

export const writeToExampleEnv = (path: string, parsedEnv: object) => {
	fs.writeFile(path, envToString(parsedEnv), err => {
		if (err) console.log(`failed to update ${basename(path)}`);
	});
};

export const emptyObjProps = (obj: EnvObject) => {
	const objCopy = { ...obj };
	Object.keys(objCopy).forEach(key => {
		objCopy[key] = "";
	});

	return objCopy;
};

export const getUniqueVarsFromEnvs = (env: object, envExample: EnvObject) => {
	// making use of the .env because that should be the single source of truth
	// the .env.example should be based off the .env and not otherwise
	const uniqueKeys = new Set(getObjKeys(env));
	const uniqueKeysArray: Array<string> = Array.from(uniqueKeys);
	return uniqueKeysArray
		.map(key => ({ [key]: envExample[key] || '' }));
}

export const removeStaleVarsFromEnv = (env: object, vars: EnvObject[]) => {
	let envCopy: EnvObject = { ...env };
	envCopy = emptyObjProps(envCopy);

	vars.forEach(envObj => {
		const [key] = Object.keys(envObj);
		if (envCopy.hasOwnProperty(key)) {
			envCopy[key] = envObj[key];
		}
	});

	return envCopy;
};

export const getParsedEnvs = (env: object, envExample: object) => {
	const envObj = { ...env };
	const uniqueVars = getUniqueVarsFromEnvs(envObj, envExample);

	return removeStaleVarsFromEnv(envObj, uniqueVars);
};

export const syncWithExampleEnv = (envPath: string, envExamplePath: string) => {
	const parsedEnvs = getParsedEnvs(
		parseEnv(envPath, { emptyLines: true }),
		parseEnv(envExamplePath)
	);
	writeToExampleEnv(envExamplePath, parsedEnvs);
};

export const watchEnv = (envPath: string, envExamplePath: string) => {
	fs.watchFile(envPath, () => syncWithExampleEnv(envPath, envExamplePath));
};

export const syncEnv = (filename?: string) => {
	const EXAMPLE_ENV_PATH = resolve(
		process.cwd(),
		filename || DEFAULT_EXAMPLE_ENV_FILENAME
	);

	if (!fileExists(ENV_PATH)) {
		throw new Error("Cannot find .env in project root");
	}

	if (!fileExists(EXAMPLE_ENV_PATH)) {
		writeToExampleEnv(
			DEFAULT_EXAMPLE_ENV_FILENAME,
			emptyObjProps(parseEnv(ENV_PATH))
		);
	} else syncWithExampleEnv(ENV_PATH, EXAMPLE_ENV_PATH);

	watchEnv(ENV_PATH, EXAMPLE_ENV_PATH);
};
