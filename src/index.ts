import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";

// Load environment variables
dotenv.config();

const API_TOKEN = process.env.API_TOKEN;
const API_ENDPOINT = "https://poi.molecule.xyz/api/v1/inventions";

if (!API_TOKEN) {
  throw new Error("API_TOKEN must be set in environment variables");
}

type Hex = `0x${string}`;
interface PoIAPIResponse {
  to: string;
  data: {
    proof: {
      format: string;
      tree: Array<Hex>;
      values: Array<{ value: Hex; treeIndex: number }>;
    };
    transaction: {
      data: Hex;
      to: Hex;
    };
  };
  metadata: {
    supportedEvmChainIds: Array<number>;
  };
  success: boolean;
}

// Define the schema for poi creation tool
const ProcessFileSchema = {
  name: "create_proof_of_invention_request",
  description:
    "Process a file from the filesystem and prepares an unsigned transaction request to anchor a Proof of Innovation hash on a an evm blockchain.",
  parameters: z.object({
    filepath: z.string().describe("Path to the file to be processed"),
  }),
  returns: z.object({
    supported_evm_chainIds: z.array(z.number()).describe("List of supported blockchain networks"),
    transaction_request: z
      .object({
        to: z.string(),
        data: z.string(),
        value: z.string()
      })
      .describe("Unsigned transaction request parameters that can be used to build a transaction to be transmitted to a supported blockchain network"),
  }),
} as const;

// Create the MCP server
const server = new McpServer(
  {
    name: "mcp-poi-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {
        create_proof_of_invention: ProcessFileSchema,
      },
    },
  }
);

// Implement the file processing tool
server.tool(
  ProcessFileSchema.name,
  ProcessFileSchema.parameters.shape,
  async (args) => {
    try {
      // Resolve and validate file path
      const filePath = path.resolve(args.filepath);
      const filename = path.basename(filePath);

      // Create form data
      const formData = new FormData();

      // Read file as a stream and append to form data
      const fileStream = await fs.open(filePath, "r");
      formData.append("files", fileStream.createReadStream(), {
        filename: filename,
        contentType: "application/octet-stream",
      });

      // Send to API with authorization
      const response = await axios.post<PoIAPIResponse>(
        API_ENDPOINT,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${API_TOKEN}`,
          },
          // Disable timeout for large uploads
          timeout: 0,
        }
      );

      // Close the file stream
      await fileStream.close();
      // Return the transaction data
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              supported_evm_chainIds: response.data.metadata.supportedEvmChainIds,
              transaction_request: {
                to: response.data.data.transaction.to,
                data: response.data.data.transaction.data,
                value: 0,
              },
            }),
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to process file: ${errorMessage}`,
            },
          ],
        };
      }
      throw error;
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  //console.log("MCP POI Server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
