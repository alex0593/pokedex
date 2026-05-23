import logging
import sys

from pythonjsonlogger import jsonlogger


def setup_json_logging(app_name: str = "pokedex"):
    """Configure JSON logging for production."""
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # JSON formatter
    class CustomJsonFormatter(jsonlogger.JsonFormatter):
        def add_fields(self, log_record, record, message_dict):
            super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
            log_record['app'] = app_name
            log_record['level'] = record.levelname

    # Console handler with JSON
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(CustomJsonFormatter())
    logger.addHandler(console_handler)

    return logger
