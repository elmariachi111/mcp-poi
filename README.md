# MCP POI Server

A Model Context Protocol server for processing files and preparing blockchain transactions. This server can be installed in Claude Desktop and provides a tool to process files and prepare them for blockchain transactions.

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the server:
   ```bash
   npm run build
   ```

## Environment Variables

- `API_TOKEN`: Your API bearer token for authentication against the PoI API


## Usage

The server provides a tool called `create_proof_of_invention_request` that accepts a file path returns prepared transaction data suitable for blockchain execution. This can be reused by your favorite tool that can sign and submit transactions.  The binary content should be provided by the MCP client (e.g., Claude Desktop or Cursor). 

https://docs.molecule.to/documentation/proof-of-invention-poi/api-access-beta

### Adding to Claude Desktop

```json
"poi": {
  "command": "node",
  "args": [
    "<working_dir>/mcp-poi/build/index.js"
  ],
  "env": {
    "API_TOKEN": "the api token"
  }
},
```

### Tool Schema

Input:
```typescript
{
  filepath: string  // A path of a binary
}
```

Output:
```typescript
{
  transaction_request: {
    to: string,      // a PoI anchoring address (usually starts with 0x1dea)
    data: string,    // the merkle root hash that represents the PoI
    value: string,   // 0
  }
}
```

## Running the Server

```bash
npm start
```

## Development

For development with automatic rebuilding:

```bash
npm run dev
```

## Error Handling

The server includes robust error handling for:
- Missing environment variables
- Invalid file content
- API communication errors
- Invalid response formats

## Security

- API tokens are loaded from environment variables
- File contents are properly encoded before transmission
- Error messages are sanitized to prevent information leakage
- No filesystem access required - all content is provided by the MCP client 