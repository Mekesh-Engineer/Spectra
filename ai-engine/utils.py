"""
Shared utilities for the AI processing module.
"""

import logging
import sys

# Configure logger
logging.basicConfig(
    level=logging.INFO,
    format="[Spectra AI] %(levelname)s %(message)s",
    stream=sys.stdout,
)

logger = logging.getLogger("spectra-ai")
