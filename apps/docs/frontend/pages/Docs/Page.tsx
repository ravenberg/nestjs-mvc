import { Head } from 'nestjs-mvc/react'
import type { ReactNode } from 'react'
import type { DocsPage } from '../../../src/docs/docs.service'
import { DocsHeader } from '../../components/DocsHeader'
import { Layout } from '../../components/Layout'
import { Markdown } from '../../components/Markdown'
import { PrevNextLinks } from '../../components/PrevNextLinks'
import { Prose } from '../../components/Prose'
import { TableOfContents } from '../../components/TableOfContents'

/** One component for every content page: the controller decides which file, this renders it. */
function Page({ title, section, content, toc, previous, next }: DocsPage) {
  return (
    <>
      <Head title={`${title} - nestjs-mvc`} />
      <div className="max-w-2xl min-w-0 flex-auto px-4 py-16 lg:max-w-none lg:pr-0 lg:pl-8 xl:px-16">
        <article>
          <DocsHeader title={title} section={section} />
          <Prose>
            <Markdown content={content} />
          </Prose>
        </article>
        <PrevNextLinks previous={previous} next={next} />
      </div>
      <TableOfContents tableOfContents={toc} />
    </>
  )
}

Page.layout = (page: ReactNode) => <Layout>{page}</Layout>

export default Page
