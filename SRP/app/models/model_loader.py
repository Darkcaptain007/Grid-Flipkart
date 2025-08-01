# app/models/model_loader.py
import torch
from sentence_transformers import SentenceTransformer, CrossEncoder
from ..core.config import EMBEDDING_MODEL, RERANKER_MODEL

device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Loading models on device: {device}")

# This dictionary will hold the loaded models
models = {
    "embedding_model": SentenceTransformer(EMBEDDING_MODEL, device=device),
    "reranker_model": CrossEncoder(RERANKER_MODEL, device=device, max_length=512)
}

def get_embedding_model():
    return models["embedding_model"]

def get_reranker_model():
    return models["reranker_model"]