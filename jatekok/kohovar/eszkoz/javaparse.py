# Egyszerű Java-részhalmaz olvasó a Mindustry Java-modok tartalomleírásaihoz
# (x = new Típus("név", ...) {{ mező = érték; hívás(...); }};). A kifejezéseket Python-értékekké alakítja;
# amit nem tud kiértékelni (lambdák, effektek, rajzolás), azt Unknown-ként adja vissza.
import re

TOK = re.compile(r'''
 (?P<ws>\s+|//[^\n]*|/\*.*?\*/)
|(?P<str>"(?:\\.|[^"\\])*")
|(?P<chr>'(?:\\.|[^'\\])')
|(?P<num>(?:0x[0-9a-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)[fFdDlL]?)
|(?P<id>[A-Za-z_$][A-Za-z0-9_$]*)
|(?P<op>->|::|\+\+|--|&&|\|\||[=!<>+\-*/%&|^]=|<<|>>>?|[{}()\[\];,.?:=<>+\-*/%!~&|^@])
''', re.S | re.X)


def tokens(src):
    out, i = [], 0
    while i < len(src):
        m = TOK.match(src, i)
        if not m: i += 1; continue
        i = m.end(); k = m.lastgroup
        if k == 'ws': continue
        out.append((k, m.group()))
    out.append(('eof', ''))
    return out


class Unknown:
    def __init__(s, why=''): s.why = why
    def __repr__(s): return '?'
    def __bool__(s): return False
U = Unknown()


class Ref:
    def __init__(s, path): s.path = path
    def __repr__(s): return 'Ref(%s)' % s.path


class Obj:
    def __init__(s, typ, args):
        s.type, s.args, s.f, s.calls = typ, args, {}, []
    def __repr__(s): return 'Obj(%s %r %r %r)' % (s.type, s.args, s.f, s.calls)


class Call:
    def __init__(s, target, name, args): s.target, s.name, s.args = target, name, args
    def __repr__(s): return 'Call(%s.%s %r)' % (s.target, s.name, s.args)


CONST = {'Time.toSeconds': 60, 'Time.toMinutes': 3600, 'tilesize': 8, 'Vars.tilesize': 8, 'Mathf.pi': 3.14159, 'Mathf.PI': 3.14159, 'Mathf.PI2': 6.28318,
         'Float.MAX_VALUE': 1e30, 'Integer.MAX_VALUE': 2147483647, 'Mathf.sqrt2': 1.41421, 'Mathf.degRad': 0.0174533, 'Mathf.radDeg': 57.2958, 'Mathf.e': 2.71828}


class P:
    def __init__(s, src, env=None):
        s.t, s.i, s.env = tokens(src), 0, env if env is not None else {}

    def pk(s, o=0): return s.t[min(s.i + o, len(s.t) - 1)]
    def nx(s): t = s.t[s.i]; s.i += 1; return t
    def at(s, v, o=0): return s.pk(o)[1] == v and s.pk(o)[0] in ('op', 'id')
    def eat(s, v):
        if s.at(v): s.i += 1; return True
        return False

    def skip_bal(s):          # egy (), {}, [] csoport átugrása
        o = s.nx()[1]; c = {'(': ')', '{': '}', '[': ']'}[o]; d = 1
        while d and s.pk()[0] != 'eof':
            v = s.nx()[1]
            if s.t[s.i - 1][0] == 'op':
                if v in '({[': d += 1
                elif v in ')}]': d -= 1

    def skip_generic(s):      # <...> típusparaméterek
        if s.at('<'):
            d = 0
            while True:
                v = s.nx()[1]
                if v == '<': d += 1
                elif v == '>': d -= 1
                elif v == '>>': d -= 2
                if d <= 0 or s.pk()[0] == 'eof': break

    def args(s):
        s.eat('(') or (_ for _ in ()).throw(SyntaxError('( kell'))
        out = []
        while not s.at(')') and s.pk()[0] != 'eof':
            out.append(s.expr())
            if not s.eat(','): break
        s.eat(')')
        return out

    # ---- kifejezések ----
    def expr(s):
        # lambda: x -> ..., (a, b) -> ..., () -> ...
        if s.pk()[0] == 'id' and s.at('->', 1): s.i += 2; s.lambda_body(); return U
        if s.at('('):
            j, d = s.i, 0
            while True:
                v = s.t[j]
                if v[1] == '(' and v[0] == 'op': d += 1
                elif v[1] == ')' and v[0] == 'op':
                    d -= 1
                    if d == 0: break
                if v[0] == 'eof': break
                j += 1
            if s.t[j + 1][1] == '->': s.i = j + 2; s.lambda_body(); return U
        return s.assign()

    def lambda_body(s):
        if s.at('{'): s.skip_bal()
        else: s.expr()

    def assign(s):
        left = s.ternary()
        if s.pk()[0] == 'op' and s.pk()[1] in ('=', '+=', '-=', '*=', '/='):
            s.nx(); s.assign()
        return left

    def ternary(s):
        c = s.binop(0)
        if s.eat('?'):
            a = s.expr(); s.eat(':'); b = s.expr()
            return a if c is True else b if c is False else (a if not isinstance(a, Unknown) else b)
        return c

    PREC = [('||',), ('&&',), ('|',), ('^',), ('&',), ('==', '!='), ('<', '>', '<=', '>=', 'instanceof'), ('<<', '>>', '>>>'), ('+', '-'), ('*', '/', '%')]

    def binop(s, lv):
        if lv >= len(s.PREC): return s.unary()
        a = s.binop(lv + 1)
        while s.pk()[0] == 'op' and s.pk()[1] in s.PREC[lv] or (s.PREC[lv] == ('<', '>', '<=', '>=', 'instanceof') and s.at('instanceof')):
            op = s.nx()[1]; b = s.binop(lv + 1)
            a = s.arith(op, a, b)
        return a

    def arith(s, op, a, b):
        num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool)
        if op == '+' and (isinstance(a, str) or isinstance(b, str)) and not isinstance(a, Unknown) and not isinstance(b, Unknown): return str(a) + str(b)
        if not (num(a) and num(b)): return U
        try:
            return {'+': a + b, '-': a - b, '*': a * b, '/': a / b if b else U, '%': a % b if b else U, '<': a < b, '>': a > b, '<=': a <= b, '>=': a >= b, '==': a == b, '!=': a != b}.get(op, U)
        except Exception: return U

    def unary(s):
        if s.eat('-'): v = s.unary(); return -v if isinstance(v, (int, float)) and not isinstance(v, bool) else U
        if s.eat('+'): return s.unary()
        if s.eat('!'): v = s.unary(); return (not v) if isinstance(v, bool) else U
        if s.eat('~'): s.unary(); return U
        # típuskonverzió: (int)x, (float)(...)
        if s.at('(') and s.pk(1)[0] == 'id' and s.pk(1)[1] in ('int', 'float', 'double', 'long', 'short', 'byte') and s.at(')', 2):
            s.i += 3; return s.unary()
        if s.at('(') and s.pk(1)[0] == 'id' and s.pk(1)[1][:1].isupper():      # (Típus) kifejezés
            j = s.i + 2
            while s.t[j][1] == '.' and s.t[j + 1][0] == 'id': j += 2
            if s.t[j][1] == ')' and (s.t[j + 1][0] in ('id', 'num', 'str') or s.t[j + 1][1] == '('):
                s.i = j + 1; return s.unary()
        return s.postfix(s.primary())

    def primary(s):
        k, v = s.pk()
        if k == 'num':
            s.nx(); t = v.rstrip('fFdDlL')
            try: return int(t, 16) if t.startswith('0x') else (float(t) if any(c in t for c in '.eE') or v[-1] in 'fFdD' else int(t))
            except Exception: return U
        if k == 'str': s.nx(); return bytes(v[1:-1], 'utf-8').decode('unicode_escape') if '\\' in v else v[1:-1]
        if k == 'chr': s.nx(); return v[1:-1]
        if s.eat('('): e = s.expr(); s.eat(')'); return e
        if k == 'id':
            if v in ('true', 'false'): s.nx(); return v == 'true'
            if v == 'null': s.nx(); return None
            if v == 'new': return s.new()
            if v == 'this': s.nx(); return Ref('this')
            if v == 'super': s.nx(); return Ref('super')
            s.nx(); path = v
            # pontozott név (Items.copper) – metódushívásig
            while s.at('.') and s.pk(1)[0] == 'id' and not s.at('(', 2):
                s.i += 1; path += '.' + s.nx()[1]
            if s.at('('):
                parts = path.rsplit('.', 1)
                a = s.args()
                return Call(Ref(parts[0]) if len(parts) > 1 else None, parts[-1], a)
            if s.at('::'): s.i += 2; return U
            if path in CONST: return CONST[path]
            if path in s.env: return s.env[path]
            return Ref(path)
        if s.at('{'):      # tömbinicializáló
            s.nx(); out = []
            while not s.at('}') and s.pk()[0] != 'eof':
                out.append(s.expr())
                if not s.eat(','): break
            s.eat('}'); return out
        if s.at('@'): s.nx(); s.nx(); return s.primary()
        s.nx(); return U

    def postfix(s, v):
        while True:
            if s.at('.') and s.pk(1)[0] == 'id':
                s.i += 1; name = s.nx()[1]
                if s.at('('): v = Call(v, name, s.args())
                else: v = Ref((v.path if isinstance(v, Ref) else '?') + '.' + name)
            elif s.at('['): s.skip_bal(); v = U
            elif s.at('++') or s.at('--'): s.nx()
            else: return v

    def new(s):
        s.nx()  # new
        typ = s.nx()[1]
        while s.at('.') and s.pk(1)[0] == 'id': s.i += 1; typ += '.' + s.nx()[1]
        s.skip_generic()
        if s.at('['):                       # new X[]{...} / new X[n]
            while s.at('['): s.skip_bal()
            if s.at('{'): return s.primary()
            return []
        a = s.args() if s.at('(') else []
        o = Obj(typ.split('.')[-1], a)
        if s.at('{') and s.at('{', 1):      # dupla zárójeles inicializáló (vagy névtelen osztály példány-blokkal)
            s.i += 2; s.body(o); s.eat('}')
            if not s.eat('}'): s.anon(o, True)
        elif s.at('{'):                     # névtelen osztály felülírt metódusokkal
            s.anon(o)
        return o

    def anon(s, o, inside=False):
        if not inside: s.nx()
        d = 1
        while d and s.pk()[0] != 'eof':
            t = s.nx()
            if t[0] == 'op' and t[1] == '{':
                # példány-inicializáló blokk a névtelen osztályban: { ... }
                if d == 1 and s.t[s.i - 2][1] in ('{', '}', ';'): s.body(o); s.eat('}'); continue
                d += 1
            elif t[0] == 'op' and t[1] == '}': d -= 1
        o.f.setdefault('_overrides', True)

    # ---- utasítások egy {{ }} blokkban ----
    def body(s, o):
        while not s.at('}') and s.pk()[0] != 'eof':
            s.stmt(o)

    def stmt(s, o):
        k, v = s.pk()
        if s.at(';'): s.nx(); return
        if s.at('{'): s.skip_bal(); return
        if k == 'id' and v in ('if', 'for', 'while', 'switch', 'try', 'synchronized'):
            s.nx()
            if s.at('('): s.skip_bal()
            if s.at('{'): s.skip_bal()
            else: s.stmt(Obj('_', []))
            while s.at('else') or s.at('catch') or s.at('finally'):
                s.nx()
                if s.at('('): s.skip_bal()
                if s.at('{'): s.skip_bal()
                elif s.at('if'): s.stmt(Obj('_', []))
                else: s.stmt(Obj('_', []))
            return
        if k == 'id' and v == 'return': s.nx(); s.expr(); s.eat(';'); return
        # helyi változó: Típus név = érték;
        j = s.i
        if k == 'id' and v not in ('this',) and s.pk(1)[0] == 'id' or (k == 'id' and s.at('<', 1)) or (k == 'id' and s.at('[', 1) and s.at(']', 2)):
            save = s.i
            s.nx(); s.skip_generic()
            while s.at('['): s.skip_bal()
            if s.pk()[0] == 'id' and (s.at('=', 1) or s.at(';', 1)):
                name = s.nx()[1]
                val = s.expr() if s.eat('=') else None
                s.env[name] = val; s.eat(';'); return
            s.i = save
        # mezőlánc: a = b = c = kifejezés;  /  this.x = ...
        names = []
        while True:
            save = s.i
            if s.at('this') and s.at('.', 1): s.i += 2
            if s.pk()[0] == 'id':
                path = s.nx()[1]
                while s.at('.') and s.pk(1)[0] == 'id' and not s.at('(', 2): s.i += 1; path += '.' + s.nx()[1]
                if s.pk()[0] == 'op' and s.pk()[1] in ('=', '+=', '-=', '*=', '/='):
                    op = s.nx()[1]; names.append((path, op)); continue
            s.i = save; break
        if names:
            val = s.expr()
            for path, op in names:
                if op == '=': o.f[path] = val
                elif path in o.f: o.f[path] = s.arith(op[0], o.f[path], val)
            s.eat(';'); return
        e = s.expr()
        if isinstance(e, Call): o.calls.append(e)
        s.eat(';')
        if s.i == j: s.nx()


def parse_defs(src, env=None):
    """A load() jellegű metódusokban álló `név = new Típus(...) {{...}};` definíciók."""
    p = P(src, env); out = []
    while p.pk()[0] != 'eof':
        if p.pk()[0] == 'id' and p.at('=', 1) and p.at('new', 2):
            name = p.nx()[1]; p.nx()
            try: o = p.expr()
            except Exception as e: o = U
            if isinstance(o, Obj): out.append((name, o)); p.env[name] = o
            p.eat(';')
        else: p.nx()
    return out
