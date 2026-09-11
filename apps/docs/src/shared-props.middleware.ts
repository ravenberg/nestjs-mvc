import { Injectable, NestMiddleware } from '@nestjs/common'
import { requestState, type AnyRequest } from 'nestjs-mvc'
import { navigation } from './navigation'

/** Every page gets the sidebar structure; the pages never import server code. */
@Injectable()
export class SharedPropsMiddleware implements NestMiddleware {
  use(req: AnyRequest, _res: unknown, next: () => void) {
    requestState(req).shared.navigation = navigation
    next()
  }
}
