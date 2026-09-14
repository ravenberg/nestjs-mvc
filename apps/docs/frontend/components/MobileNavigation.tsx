import { Link, usePage } from 'nestjs-mvc/react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { useCallback, useEffect, useState, type ComponentPropsWithoutRef, type MouseEvent } from 'react'
import { Logomark } from './Logo'
import { Navigation } from './Navigation'

function MenuIcon(props: ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function CloseIcon(props: ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" {...props}>
      <path d="M5 5l14 14M19 5l-14 14" />
    </svg>
  )
}

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const close = useCallback(() => setIsOpen(false), [])
  const { url } = usePage()

  // A visit landed: close the drawer.
  useEffect(() => close(), [url, close])

  function onLinkClick(event: MouseEvent<Element>) {
    const link = event.currentTarget as HTMLAnchorElement
    if (link.pathname + link.search + link.hash === window.location.pathname + window.location.search + window.location.hash) {
      close()
    }
  }

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="relative" aria-label="Open navigation">
        <MenuIcon className="h-6 w-6 stroke-neutral-500" />
      </button>
      <Dialog
        open={isOpen}
        onClose={close}
        className="fixed inset-0 z-50 flex items-start overflow-y-auto bg-neutral-900/50 pr-10 backdrop-blur-sm lg:hidden"
        aria-label="Navigation"
      >
        <DialogPanel className="min-h-full w-full max-w-xs bg-white px-4 pt-5 pb-12 sm:px-6 dark:bg-neutral-900">
          <div className="flex items-center">
            <button type="button" onClick={close} aria-label="Close navigation">
              <CloseIcon className="h-6 w-6 stroke-neutral-500" />
            </button>
            <Link href="/" className="ml-6" aria-label="Home page">
              <Logomark className="h-9 w-9" />
            </Link>
          </div>
          <Navigation className="mt-5 px-1" onLinkClick={onLinkClick} />
        </DialogPanel>
      </Dialog>
    </>
  )
}
