from collections.abc import Sequence


def embed_texts(client: object, model: str, texts: Sequence[str]) -> list[list[float]]:
    vectors: list[list[float]] = []
    for start in range(0, len(texts), 100):
        batch = list(texts[start : start + 100])
        if not batch:
            continue
        response = client.embeddings.create(model=model, input=batch)
        vectors.extend([list(item.embedding) for item in response.data])
    return vectors
