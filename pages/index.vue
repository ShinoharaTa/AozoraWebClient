<template>
  <div>
    <header-outline>
      <button class="btn btn-theme-outline" type="submit" @click="getTimeline">
        <fa-icon :icon="['fas', 'arrows-rotate']" />
        Reload
      </button>
    </header-outline>
    <timeline-note
      :note="note"
      v-for="note in timeline"
      :key="note.id"
      @reload="singleReload(note.post.uri)"
    />
    <!-- <postarea @posted="getTimeline" /> -->
    <footer-outline></footer-outline>
    <overlay v-if="showLightBox" :close="true" @close="closeLightBox()">
      <lightbox></lightbox>
    </overlay>
    <!-- {{ timeline }} -->
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import HeaderOutline from '~/components/HeaderOutline.vue'
import Overlay from '~/components/Overlay.vue'
import Postarea from '~/components/Postarea.vue'
import { mapGetters, mapMutations, mapActions } from 'vuex'
import Lightbox from '~/components/Lightbox.vue'

interface VueData {
  timeline: Array<Object>
}

export default Vue.extend({
  components: { HeaderOutline, Postarea, Overlay, Lightbox },
  data(): VueData {
    return {
      timeline: [],
    }
  },
  async beforeMount() {
    await this.$atp.hasSession()
    await this.getTimeline()
  },
  methods: {
    ...mapMutations({
      setLightboxImages: 'setLightboxImages',
    }),
    getTimeline: async function () {
      let data = await this.$atp.getTimeline({ limit: 100 })
      if (data) {
        console.log(data)
        this.timeline = data.feed
      } else {
        this.$router.push('/login')
      }
    },
    singleReload: async function (uri: string){
      const res = await this.$atp.getPost({uri: uri})
      const index = this.timeline.findIndex(note => note.post.uri === res.uri);
      this.timeline[index].post = Object.assign({}, res);
    },
    checkNewPost: async function () {},
    closeLightBox: function () {
      this.setLightboxImages({ images: null, page: 0 })
    },
  },
  computed: {
    ...mapGetters({
      overlayView: 'overlayView',
      lightboxImages: 'lightboxImages',
    }),
    showLightBox: function (): boolean {
      return !!this.lightboxImages
    },
  },
})
</script>
