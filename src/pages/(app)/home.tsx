import { Link } from 'react-router-dom'
import { useAuthProfileReady } from 'deepspace'

export default function HomePage() {
  const { isSignedIn, user } = useAuthProfileReady({ requireUser: true })

  return (
    <div className="flex min-h-full flex-col justify-center gap-4 px-8 py-16 text-foreground">
      <h1 className="text-3xl" style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 560 }}>
        The table is set.
      </h1>
      <p className="max-w-md text-muted-foreground">
        Plans, seats, and the notepad live on the table. Sign in to sit down.
      </p>
      <Link to="/table" className="w-fit border border-border px-4 py-2">
        Open the table
      </Link>
      {isSignedIn && user && (
        <p className="text-sm text-muted-foreground">Signed in as {user.name ?? user.email}</p>
      )}
    </div>
  )
}
