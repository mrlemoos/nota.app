import { Form } from 'react-router';
import { Button } from '@/components/ui/button';

export default function NotesIndex() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="h-16 w-16 text-muted-foreground"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <h2 className="mb-2 font-serif text-xl font-semibold tracking-normal text-foreground">
          Select a note
        </h2>
        <p className="mb-6 text-muted-foreground">
          Choose a note from the sidebar or create a new one.
        </p>
        <Form method="post" action="/notes">
          <Button type="submit" size="lg" className="min-h-10 px-6">
            Create New Note
          </Button>
        </Form>
      </div>
    </div>
  );
}
