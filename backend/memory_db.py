from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Tuple


def _match(doc: Dict[str, Any], flt: Dict[str, Any]) -> bool:
    if not flt:
        return True
    for k, v in flt.items():
        if isinstance(v, dict):
            if "$ne" in v:
                if doc.get(k) == v["$ne"]:
                    return False
            else:
                return False
        else:
            if doc.get(k) != v:
                return False
    return True


def _apply_projection(doc: Dict[str, Any], proj: Optional[Dict[str, int]]) -> Dict[str, Any]:
    if not proj:
        return dict(doc)
    # If any include=1 exists, treat as include projection.
    includes = {k for k, v in proj.items() if v == 1}
    if includes:
        return {k: doc.get(k) for k in includes if k in doc}
    # Otherwise treat as exclude projection (0).
    out = dict(doc)
    for k, v in proj.items():
        if v == 0 and k in out:
            out.pop(k, None)
    return out


@dataclass
class MemoryCursor:
    items: List[Dict[str, Any]]
    _sort: Optional[Tuple[str, int]] = None

    def sort(self, key: str, direction: int):
        self._sort = (key, direction)
        return self

    async def to_list(self, length: int = 1000):
        xs = list(self.items)
        if self._sort:
            k, d = self._sort
            xs.sort(key=lambda it: it.get(k, ""), reverse=(d < 0))
        return xs[:length]


@dataclass
class MemoryCollection:
    name: str
    docs: List[Dict[str, Any]] = field(default_factory=list)

    async def count_documents(self, flt: Dict[str, Any]):
        return sum(1 for d in self.docs if _match(d, flt))

    async def find_one(self, flt: Dict[str, Any], proj: Optional[Dict[str, int]] = None):
        for d in self.docs:
            if _match(d, flt):
                return _apply_projection(d, proj)
        return None

    def find(self, flt: Dict[str, Any], proj: Optional[Dict[str, int]] = None):
        items = [_apply_projection(d, proj) for d in self.docs if _match(d, flt)]
        return MemoryCursor(items)

    async def insert_one(self, doc: Dict[str, Any]):
        self.docs.append(dict(doc))
        return {"inserted_id": doc.get("id")}

    async def insert_many(self, docs: Iterable[Dict[str, Any]]):
        ids = []
        for d in docs:
            self.docs.append(dict(d))
            ids.append(d.get("id"))
        return {"inserted_ids": ids}

    async def update_one(self, flt: Dict[str, Any], upd: Dict[str, Any]):
        for i, d in enumerate(self.docs):
            if _match(d, flt):
                if "$set" in upd and isinstance(upd["$set"], dict):
                    self.docs[i] = {**d, **upd["$set"]}
                return {"matched_count": 1, "modified_count": 1}
        return {"matched_count": 0, "modified_count": 0}

    async def aggregate(self, pipeline: List[Dict[str, Any]]):
        # Minimal implementation used by /chat/threads:
        # [{"$sort":{"created_at":-1}}, {"$group":{"_id":"$thread_id","last":{"$first":"$$ROOT"}}}]
        items = list(self.docs)
        for stage in pipeline:
            if "$sort" in stage:
                (k, d), = stage["$sort"].items()
                items.sort(key=lambda it: it.get(k, ""), reverse=(d < 0))
            elif "$group" in stage:
                grp = stage["$group"]
                key_expr = grp.get("_id")
                if key_expr != "$thread_id":
                    raise NotImplementedError("Only grouping by $thread_id supported")
                out = {}
                for it in items:
                    tid = it.get("thread_id")
                    if tid not in out:
                        out[tid] = {"_id": tid, "last": dict(it)}
                items = list(out.values())
            else:
                raise NotImplementedError("Unsupported aggregate stage")

        return MemoryCursor(items)


class MemoryDB:
    def __init__(self):
        self._cols: Dict[str, MemoryCollection] = {}

    def __getattr__(self, name: str):
        return self.collection(name)

    def collection(self, name: str) -> MemoryCollection:
        if name not in self._cols:
            self._cols[name] = MemoryCollection(name=name)
        return self._cols[name]

    async def command(self, name: str):
        if name == "ping":
            return {"ok": 1}
        raise NotImplementedError()

