import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OllamaEmbeddings } from '@langchain/ollama';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { Ollama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';

const VECTOR_STORE_DIR = path.join(process.cwd(), 'server', 'data', 'vectorstores');

// Ensure directory exists
if (!fs.existsSync(VECTOR_STORE_DIR)) {
  fs.mkdirSync(VECTOR_STORE_DIR, { recursive: true });
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

// Initialize Ollama embeddings and LLM
const embeddings = new OllamaEmbeddings({
  model: 'llama3',
  baseUrl: OLLAMA_BASE_URL,
});

const model = new Ollama({
  model: 'llama3',
  temperature: 0.1,
  baseUrl: OLLAMA_BASE_URL,
});

export const ingestDocument = async (projectId, filePath) => {
  try {
    // 1. Load PDF
    const loader = new PDFLoader(filePath);
    const rawDocs = await loader.load();

    // 2. Split text
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const docs = await textSplitter.splitDocuments(rawDocs);

    // 3. Create or load vector store
    const storePath = path.join(VECTOR_STORE_DIR, `project_${projectId}`);
    let vectorStore;
    
    if (fs.existsSync(storePath)) {
      vectorStore = await HNSWLib.load(storePath, embeddings);
      await vectorStore.addDocuments(docs);
    } else {
      vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    }
    
    // 4. Save vector store
    await vectorStore.save(storePath);
    
    return true;
  } catch (error) {
    console.error('Error ingesting document:', error);
    throw error;
  }
};

export const askQuestion = async (projectId, question) => {
  try {
    const storePath = path.join(VECTOR_STORE_DIR, `project_${projectId}`);
    
    if (!fs.existsSync(storePath)) {
      return "לא נמצאו מסמכים שנסרקו לפרויקט זה. אנא העלה מסמכים תחילה.";
    }

    const vectorStore = await HNSWLib.load(storePath, embeddings);
    const retriever = vectorStore.asRetriever(4); // Get top 4 most relevant chunks
    
    const relevantDocs = await retriever.invoke(question);
    const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');

    const prompt = PromptTemplate.fromTemplate(`
      You are an AI assistant for a construction project management system.
      Answer the user's question in Hebrew based ONLY on the following context.
      If you don't know the answer based on the context, say "אין לי מידע לגבי זה במסמכים שהועלו".
      
      Context:
      {context}
      
      Question: {question}
      
      Answer in Hebrew:
    `);

    const chain = RunnableSequence.from([
      prompt,
      model,
      new StringOutputParser(),
    ]);

    const response = await chain.invoke({
      context,
      question,
    });

    return response;
  } catch (error) {
    console.error('Error asking question:', error);
    throw error;
  }
};
