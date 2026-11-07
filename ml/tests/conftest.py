"""Synthetic suite runs offline, including optional experiment tracking."""

import socket

import pytest


@pytest.fixture(autouse=True)
def offline_runtime(monkeypatch):
    def blocked(*args, **kwargs):
        raise AssertionError("Tests must not open network connections")

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket, "create_connection", blocked)
    monkeypatch.delenv("WANDB_API_KEY", raising=False)
    monkeypatch.setenv("WANDB_MODE", "disabled")
