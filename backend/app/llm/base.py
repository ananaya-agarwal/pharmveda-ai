from abc import ABC, abstractmethod
from collections.abc import Iterator


class LLMProvider(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Return the model's plain-text response for a single-turn prompt."""
        raise NotImplementedError

    def stream(self, system_prompt: str, user_prompt: str) -> Iterator[str]:
        """Yield the response incrementally as it's generated.

        Default fallback for providers that don't support true streaming: runs
        the normal blocking call and yields the whole result once, so callers
        can always treat every provider uniformly.
        """
        yield self.generate(system_prompt, user_prompt)
