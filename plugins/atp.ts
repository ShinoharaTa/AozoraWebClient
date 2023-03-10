import { Plugin, Context } from '@nuxt/types'
import { AtpAgent, AtpSessionData } from '@atproto/api'

const COOKIE_KEY = 'AozoraUserData'

declare module 'vue/types/vue' {
  interface Vue {
    $atp: atProtoInterface
  }
}

export interface atProtoInterface {
  login(identifier: string, password: string): any
  hasSession(): any
  getTimeline(params: { limit?: number; cursor?: string }): any
  getPost(params: { uri: string })
  getPostThread(params: { uri: string; depth?: number })
  post(text: string, urls?: { url: string; indices: [number, number] }[]): any
  repost(params: { uri: string; cid: string }): any
  upvote(params: { uri: string; cid: string }): any
}

class atproto implements atProtoInterface {
  private agent: AtpAgent
  private me: any
  private ctx
  constructor(ctx: Context) {
    this.ctx = ctx
    this.agent = new AtpAgent({
      service: 'https://bsky.social',
      persistSession: (evt, sess) => {
        console.log('** 1:', typeof sess)
        this.ctx.app.$cookies.set(COOKIE_KEY, sess, {
          maxAge: 60 * 60 * 24 * 7,
        })
      },
    })
  }

  async login(identifier: string, password: string) {
    try {
      const { success, data } = await this.agent.login({
        identifier: identifier,
        password: password,
      })
      this.me = data
      return success ? data : null
    } catch {
      return null
    }
  }
  async hasSession() {
    const session = (() => {
      try {
        const sessStr: AtpSessionData = this.ctx.app.$cookies.get(COOKIE_KEY)
        if (!sessStr) {
          return null
        }
        return sessStr
      } catch {
        return null
      }
    })()
    if (!session) {
      return { success: false }
    }

    const { success, data } = await this.agent.resumeSession(session)
    try {
      this.me = data
      return success ? data : null
    } catch {
      this.ctx.app.$router.push('/login')
      return null
    }
  }
  async getTimeline(params: { limit?: number; cursor?: string }) {
    try {
      const { success, data } = await this.agent.api.app.bsky.feed.getTimeline(
        params
      )
      return success ? data : null
    } catch {
      return null
    }
  }

  async getPost(params: { uri: string }) {
    const response = await this.getPostThread({ ...params, depth: 0 })
    if (!response.thread.notFound) {
      return response.thread.post
    } else {
      return null
    }
  }
  async getPostThread(params: { uri: string; depth?: number }) {
    const { success, data } = await this.agent.api.app.bsky.feed.getPostThread(
      params
    )
    return success ? data : null
  }

  async post(
    text: string,
    urls?: { url: string; indices: [number, number] }[]
    // reply?: ReplyRef;
  ) {
    // const { text, reply, urls = [] } = params

    return this.agent.api.app.bsky.feed.post.create(
      { did: this.me.did },
      {
        text,
        entities: urls?.map(({ url, indices }) => ({
          type: 'link',
          index: {
            start: indices[0],
            end: indices[1],
          },
          value: url,
        })),
        // reply: null,
        createdAt: new Date().toISOString(),
      }
    )
  }

  async repost(params: { uri: string; cid: string }) {
    let res = this.agent.api.app.bsky.feed.repost.create(
      { did: this.me?.did },
      {
        subject: params,
        direction: 'up',
        createdAt: new Date().toISOString(),
      }
    )
    console.log('** repost ', res)
  }

  async upvote(params: { uri: string; cid: string }) {
    let res = this.agent.api.app.bsky.feed.vote.create(
      { did: this.me?.did },
      {
        subject: params,
        direction: 'up',
        createdAt: new Date().toISOString(),
      }
    )
    console.log('** favorite ', res)
    return res;
  }
}

const atp: Plugin = (context: Context, inject) => {
  const instance = new atproto(context) as atProtoInterface
  inject('atp', instance)
}

export default atp
