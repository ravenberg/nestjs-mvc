import clsx from 'clsx'
import { Highlight } from 'prism-react-renderer'
import { Fragment, useState, type ComponentPropsWithoutRef } from 'react'
import '../lib/prism-vue'
import { Button } from './Button'
import { HeroBackground } from './HeroBackground'

// The two halves of one page: the controller, and the view it renders in the
// framework the reader picked (the site-wide switch; CSS shows one variant).
const CONTROLLER = `@Controller('contacts')
export class ContactsController {
  @Get()
  @View('Contacts/Index')
  async index() {
    return { contacts: await this.contacts.find() }
  }
}`

const REACT_VIEW = `export default function Index({ contacts }: Props) {
  return (
    <ul>
      {contacts.map((contact) => (
        <li key={contact.id}>{contact.name}</li>
      ))}
    </ul>
  )
}`

const VUE_VIEW = `<script setup lang="ts">
defineProps<{ contacts: Contact[] }>()
</script>

<template>
  <ul>
    <li v-for="contact in contacts" :key="contact.id">{{ contact.name }}</li>
  </ul>
</template>`

interface Variant {
  framework?: 'react' | 'vue'
  file: string
  language: string
  code: string
}

const tabs: Variant[][] = [
  [{ file: 'contacts.controller.ts', language: 'typescript', code: CONTROLLER }],
  [
    { framework: 'react', file: 'Contacts/Index.tsx', language: 'tsx', code: REACT_VIEW },
    { framework: 'vue', file: 'Contacts/Index.vue', language: 'vue', code: VUE_VIEW },
  ],
]

// The window reserves room for the longest file, so switching never changes its height.
const maxLines = Math.max(...tabs.flat().map((variant) => variant.code.split('\n').length))

const frameworkClass = (variant: Variant) => (variant.framework ? `framework-${variant.framework}` : undefined)

function TrafficLightsIcon(props: ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 42 10" fill="none" {...props}>
      <circle cx="5" cy="5" r="4.5" />
      <circle cx="21" cy="5" r="4.5" />
      <circle cx="37" cy="5" r="4.5" />
    </svg>
  )
}

export function Hero() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="overflow-hidden bg-neutral-950 dark:-mt-19 dark:-mb-32 dark:pt-19 dark:pb-32">
      <div className="py-16 sm:px-2 lg:relative lg:px-0 lg:py-20">
        <div className="mx-auto grid max-w-2xl grid-cols-1 items-center gap-x-8 gap-y-16 px-4 lg:max-w-8xl lg:grid-cols-2 lg:px-8 xl:gap-x-16 xl:px-12">
          <div className="relative z-10 md:text-center lg:text-left">
            <div aria-hidden="true" className="absolute right-full bottom-full -mr-72 -mb-56 h-[530px] w-[530px] rounded-full bg-[radial-gradient(closest-side,rgba(234,40,69,0.28),transparent)] opacity-50" />
            <div className="relative">
              <p className="inline bg-linear-to-r from-nest-200 via-nest-400 to-nest-200 bg-clip-text font-display text-5xl tracking-tight text-transparent">
                NestJS in MVC mode.
              </p>
              <p className="mt-3 text-2xl tracking-tight text-neutral-400">
                Controllers return views. The view is your frontend framework. One process, one request cycle, zero API.
              </p>
              <div className="mt-8 flex gap-4 md:justify-center lg:justify-start">
                <Button href="/docs/installation">Get started</Button>
                <Button href="https://github.com/ravenberg/nestjs-mvc" variant="secondary">
                  View on GitHub
                </Button>
              </div>
            </div>
          </div>
          <div className="relative lg:static xl:pl-10">
            <div className="absolute inset-x-[-50vw] -top-32 -bottom-48 mask-[linear-gradient(transparent,white,white)] lg:-top-32 lg:right-0 lg:-bottom-32 lg:left-[calc(50%+14rem)] lg:mask-none dark:mask-[linear-gradient(transparent,white,transparent)] lg:dark:mask-[linear-gradient(white,white,transparent)]">
              <HeroBackground className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-0 lg:translate-x-0 lg:translate-y-[-60%]" />
            </div>
            <div className="relative">
              <div aria-hidden="true" className="absolute -top-64 -right-64 h-[530px] w-[530px] rounded-full bg-[radial-gradient(closest-side,rgba(234,40,69,0.3),transparent)]" />
              <div aria-hidden="true" className="absolute -right-44 -bottom-40 h-[567px] w-[567px] rounded-full bg-[radial-gradient(closest-side,rgba(226,55,112,0.25),transparent)]" />
              <div className="absolute inset-0 rounded-2xl bg-linear-to-tr from-nest-400 via-nest-400/70 to-nest-600 opacity-10 blur-lg" />
              <div className="absolute inset-0 rounded-2xl bg-linear-to-tr from-nest-400 via-nest-400/70 to-nest-600 opacity-10" />
              <div className="relative rounded-2xl bg-[#151112]/80 ring-1 ring-white/10 backdrop-blur-sm">
                <div className="absolute -top-px right-11 left-20 h-px bg-linear-to-r from-nest-300/0 via-nest-300/70 to-nest-300/0" />
                <div className="absolute right-20 -bottom-px left-11 h-px bg-linear-to-r from-nest-600/0 via-nest-600 to-nest-600/0" />
                <div className="pt-4 pl-4">
                  <TrafficLightsIcon className="h-2.5 w-auto stroke-neutral-500/30" />
                  <div role="tablist" aria-label="Example files" className="mt-4 flex space-x-2 text-xs">
                    {tabs.map((variants, index) => {
                      const isActive = index === activeTab
                      return (
                        <button
                          key={variants[0].file}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setActiveTab(index)}
                          className={clsx(
                            'flex h-6 cursor-pointer rounded-full p-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nest-400/60',
                            isActive
                              ? 'bg-linear-to-r from-nest-400/30 via-nest-400 to-nest-400/30 font-medium text-nest-300'
                              : 'text-neutral-500 hover:text-neutral-300',
                          )}
                        >
                          <span className={clsx('flex items-center rounded-full px-2.5', isActive && 'bg-neutral-800')}>
                            {variants.map((variant) => (
                              <span key={variant.file} className={frameworkClass(variant)}>
                                {variant.file}
                              </span>
                            ))}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {tabs[activeTab].map((variant) => (
                    <div
                      key={variant.file}
                      role="tabpanel"
                      aria-label={variant.file}
                      className={clsx('mt-6 flex items-start px-1 text-sm', frameworkClass(variant))}
                      // One text-sm line is 1.5rem; the extra line is the pre's bottom padding.
                      style={{ minHeight: `${(maxLines + 1) * 1.5}rem` }}
                    >
                      <div aria-hidden="true" className="border-r border-neutral-300/5 pr-4 font-mono text-neutral-600 select-none">
                        {Array.from({ length: variant.code.split('\n').length }).map((_, index) => (
                          <Fragment key={index}>
                            {(index + 1).toString().padStart(2, '0')}
                            <br />
                          </Fragment>
                        ))}
                      </div>
                      <Highlight code={variant.code} language={variant.language} theme={{ plain: {}, styles: [] }}>
                        {({ className, style, tokens, getLineProps, getTokenProps }) => (
                          <pre className={clsx(className, 'flex overflow-x-auto pb-6')} style={style}>
                            <code className="px-4">
                              {tokens.map((line, lineIndex) => (
                                <div key={lineIndex} {...getLineProps({ line })}>
                                  {line.map((token, tokenIndex) => (
                                    <span key={tokenIndex} {...getTokenProps({ token })} />
                                  ))}
                                </div>
                              ))}
                            </code>
                          </pre>
                        )}
                      </Highlight>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
