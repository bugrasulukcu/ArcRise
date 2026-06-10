# -*- coding: utf-8 -*-
import io, re
p = r"c:\Users\DELL\Desktop\BUGRA\ArcRise\arcrise.html"
src = io.open(p, encoding="utf-8").read()

chars = "çöüışğÇÖÜİŞĞéè—–‘’“”…≈·×●○▲►✓✗→←↑↓°±½€'"
chars += "".join(chr(c) for c in range(0x2500, 0x2580))  # box drawing

def moji(ch):
    out = ""
    for b in ch.encode("utf-8"):
        try:
            out += bytes([b]).decode("cp1252")
        except UnicodeDecodeError:
            pass  # cp1252 hole -> byte lost in original corruption
    return out

pairs = sorted(((moji(c), c) for c in chars), key=lambda x: -len(x[0]))
n = 0
for m, c in pairs:
    if len(m) < 2:
        continue
    cnt = src.count(m)
    if cnt:
        src = src.replace(m, c)
        n += cnt
io.open(p, "w", encoding="utf-8", newline="").write(src)
rest = [i + 1 for i, ln in enumerate(src.split("\n"))
        if re.search("Ã|Ä±|ÅŸ|â€|â‰|â•", ln)]
print("replaced:", n)
print("remaining lines:", rest[:30], "total:", len(rest))
