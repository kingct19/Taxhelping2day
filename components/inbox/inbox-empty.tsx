export function InboxEmpty() {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <svg viewBox="0 0 78 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-auto w-24 text-muted-foreground xl:w-30">
        <path stroke="currentColor" strokeWidth="1.5" opacity="0.3" d="M28.5 60.5h21m-37-5.5-1 4.5M65 55l1 4.5" />
        <path
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.6"
          d="M10.4 9.11A10 10 0 0 1 20.22 1h37.56a10 10 0 0 1 9.82 8.11l8.11 42.2a10 10 0 0 1-9.82 11.9H54.7a6.36 6.36 0 0 0-5.65 3.45 6.36 6.36 0 0 1-5.66 3.45H34.6a6.36 6.36 0 0 1-5.66-3.45 6.36 6.36 0 0 0-5.65-3.46H12.1a10 10 0 0 1-9.8-11.89l8.11-42.2Z"
        />
        <path
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.9"
          d="M14.3 9.03a5 5 0 0 1 4.91-4.08H58.8a5 5 0 0 1 4.91 4.08l8.07 43.22a6 6 0 0 1-5.9 7.1H52.76a5.72 5.72 0 0 0-5.24 3.41 5.72 5.72 0 0 1-5.23 3.42h-6.58a5.72 5.72 0 0 1-5.23-3.42 5.72 5.72 0 0 0-5.24-3.4h-13.1a6 6 0 0 1-5.9-7.1L14.3 9.02Z"
        />
        <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" opacity="0.6" d="M24.85 19h27.28m-28.26 7H53.1m-31.18 7h33.13M20 40h20" />
      </svg>
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-2xl font-semibold text-foreground xl:text-3xl">Select a conversation</p>
        <p className="max-w-sm text-sm text-balance text-muted-foreground">
          Choose a conversation from the inbox to read the thread, see the client, and reply.
        </p>
      </div>
    </div>
  );
}
