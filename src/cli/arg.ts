// Injected at build time by tsup.config.ts (falls back to "dev" under tsx).
declare const __NIMI_VERSION__: string | undefined;

export interface CliArgs {
	prompt?: string; // -p / --prompt: the text to send to the model
	provider?: string; // -z / --provider: which provider to use
	model?: string; // --model: override the provider's default model
	session?: string; // --session: resume a saved session id
	listSessions: boolean; // --list-sessions: print saved sessions and exit
	contextLimit?: number; // --context-limit: override the model's context window
	trace?: string; // --trace: write a JSONL showcase trace to <path>
	classic: boolean; // --classic: plain readline REPL instead of the TUI
	print: boolean; // --print: force one-shot print mode even in a TTY
	yolo: boolean; // --yolo: run all tools without asking
	version: boolean; // -v / --version
	help: boolean; // -h / --help
}

const DEFAULT_PROVIDER = "meta";

export function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		provider: undefined,
		listSessions: false,
		classic: false,
		print: false,
		yolo: false,
		version: false,
		help: false,
	};

	const positional: string[] = [];

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;

		// Support both "--flag value" and "--flag=value".
		const eq = arg.startsWith("--") ? arg.indexOf("=") : -1;
		const flag = eq === -1 ? arg : arg.slice(0, eq);
		const inline = eq === -1 ? undefined : arg.slice(eq + 1);

		// Read a flag's value from "--flag=value" or the next argument.
		const value = (): string => {
			if (inline !== undefined) return inline;
			const next = argv[++i];
			if (next === undefined || next.startsWith("-")) {
				throw new Error(`${flag} needs a value`);
			}
			return next;
		};

		switch (flag) {
			case "--prompt":
			case "-p":
				args.prompt = value();
				break;
			case "--provider":
			case "-z":
				args.provider = value();
				break;
			case "--model":
				args.model = value();
				break;
			case "--session":
				args.session = value();
				break;
			case "--list-sessions":
				args.listSessions = true;
				break;
			case "--context-limit": {
				const n = Number(value());
				if (!Number.isInteger(n) || n <= 0) throw new Error("--context-limit needs a positive integer");
				args.contextLimit = n;
				break;
			}
			case "--trace":
				args.trace = value();
				break;
			case "--classic":
				args.classic = true;
				break;
			case "--print":
				args.print = true;
				break;
			case "--yolo":
				args.yolo = true;
				break;
			case "--version":
			case "-v":
				args.version = true;
				break;
			case "--help":
			case "-h":
				args.help = true;
				break;
			default:
				if (flag.startsWith("-")) {
					throw new Error(`Unknown option: ${flag}`);
				}
				positional.push(arg);
		}
	}

	// A bare word (or several) is treated as the prompt.
	if (positional.length > 0) {
		if (args.prompt !== undefined) {
			throw new Error("Prompt given twice (use either -p or a positional message)");
		}
		args.prompt = positional.join(" ");
	}

	return args;
}

export function printHelp(): void {
	console.log(`
nimi — minimal coding agent

USAGE
  nimi -p "prompt" [options]
  nimi "prompt" [options]

OPTIONS
  -p, --prompt <text>    The prompt to send to the model
  -z, --provider <name>  Provider to use (default: ${DEFAULT_PROVIDER})
      --model <id>       Model ID (defaults to the provider's model)
      --session <id>     Resume a saved session
      --list-sessions    Print saved sessions, then exit
      --context-limit <n> Override the model's context window
      --trace <path>     Write a JSONL showcase trace (print mode)
      --classic          Plain readline REPL instead of the TUI
      --print            Force one-shot print mode even in a TTY
      --yolo             Run all tools without asking
  -v, --version          Show version
  -h, --help             Show this help

PROVIDERS
  anthropic, anthropic-openai, groq, meta, deepseek, openai

AUTH
  First run opens /login in the TUI (keys saved to ~/.nimi/auth.json).
  Headless/CI: export the provider's key instead (e.g. META_API_KEY).

EXAMPLES
  nimi -p "explain this codebase"
  nimi "list all ts files" --provider deepseek
  nimi -p "read package.json" --model <id>
`);
}

export function printVersion(): void {
	console.log(`nimi ${getVersion()}`);
}

export function getVersion(): string {
	return typeof __NIMI_VERSION__ !== "undefined" ? __NIMI_VERSION__ : "dev";
}
