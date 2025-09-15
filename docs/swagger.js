import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadYamlFile(filePath) {
	return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

// Load base swagger file
const swaggerDocument = loadYamlFile(path.join(__dirname, 'swagger.yaml'));

const PORT = process.env.PORT || 8080;
if (swaggerDocument.servers && swaggerDocument.servers.length > 0) {
	swaggerDocument.servers[0].url = `http://localhost:${PORT}`;
}

// Load paths
const pathsDir = path.join(__dirname, 'paths');
swaggerDocument.paths = {};
if (fs.existsSync(pathsDir)) {
	fs.readdirSync(pathsDir).forEach((file) => {
		if (file.endsWith('.yaml')) {
			const pathData = loadYamlFile(path.join(pathsDir, file));
			Object.assign(swaggerDocument.paths, pathData);
		}
	});
}

// Load components
swaggerDocument.components = swaggerDocument.components || {};

// Load schemas
const schemasPath = path.join(__dirname, 'components', 'schemas.yaml');
if (fs.existsSync(schemasPath)) {
	swaggerDocument.components.schemas = loadYamlFile(schemasPath);
}

// Load responses
const responsesPath = path.join(__dirname, 'components', 'responses.yaml');
if (fs.existsSync(responsesPath)) {
	swaggerDocument.components.responses = loadYamlFile(responsesPath);
}

export default swaggerDocument;