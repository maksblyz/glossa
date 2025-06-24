from abc import ABC, abstractmethod
from typing import List, Dict

class BaseExtractor(ABC):

    @abstractmethod
    def extract(self, pdf_path: str) -> list[dict]:
        pass