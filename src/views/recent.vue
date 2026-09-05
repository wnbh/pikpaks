<template>
  <div class="list-page">
    <div class="header">
      <div class="title n-ellipsis">
        <n-breadcrumb separator=">">
          <n-breadcrumb-item>
            <router-link to="">最近添加</router-link>
          </n-breadcrumb-item>
        </n-breadcrumb>
      </div>
    </div>
    <n-data-table
      v-model:checked-row-keys="checkedRowKeys"
      :row-key="(row) => row.id"
      :data="filesEvents"
      size="small"
      :columns="columns"
      :bordered="false"
      max-height="calc(100vh - 230px)"
      @scroll="scrollHandle"
      :row-props="rowProps"
    ></n-data-table>
    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="x"
      :y="y"
      :options="getMenu()"
      :show="showDropdown"
      :on-clickoutside="onClickoutside"
      @select="handleSelect"
    />
    <div class="loading" v-if="loading"><n-spin size="small" />加载中</div>
    <div class="outer-wrapper static show" v-if="checkedRowKeys.length">
      <div class="toolbar-wrapper">
        <div class="toolbar-item">
          <!--<div class="toolbar-item" @click="share(checkedRowKeys)"> 点击事件，暂未实现分享-->
          <n-tooltip>
            <template #trigger>
              <n-icon>
                <IconShare></IconShare>
              </n-icon>
            </template>
            分享
          </n-tooltip>
        </div>
      </div>
    </div>
    <n-modal v-model:show="showVideo">
      <n-card
        style="width: 80vw; height: 80vh"
        :title="fileInfo ? fileInfo.name : '视频'"
      >
        <template #header-extra>
          <n-icon size="24" @click="showVideo = false">
            <IconCircleX />
          </n-icon>
        </template>
        <div style="width: 100%; height: 100%">
          <!-- <Video :src="fileInfo.web_content_link" :type="fileInfo.mime_type"></Video> -->
          <plyr-vue :video="fileInfo"></plyr-vue>
        </div>
      </n-card>
    </n-modal>

    <n-modal v-model:show="showImage">
      <n-card
        style="width: 80vw; height: 80vh"
        :title="fileInfo ? fileInfo.name : '图片'"
      >
        <template #header-extra>
          <n-icon size="24" @click="showImage = false">
            <IconCircleX />
          </n-icon>
        </template>
        <div style="width: 100%; height: 65vh; text-align: center">
          <img
            :src="fileInfo?.web_content_link"
            style="max-width: 100%; max-height: 100%"
          />
        </div>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted, nextTick } from "vue";
import http from "../utils/axios";
import {
  DataTableColumns,
  NDataTable,
  NTime,
  NEllipsis,
  NBreadcrumb,
  NBreadcrumbItem,
  NModal,
  NCard,
  NIcon,
  NTooltip,
  NSpin,
  NImage,
  NDropdown,
  DropdownOption,
} from "naive-ui";
import PlyrVue from "../components/Plyr.vue";
import { byteConvert, getFile, refinePlayUrl, refineImageUrl } from "../utils";
import { IconShare, IconCircleX } from "@tabler/icons-vue";
import { useRouter } from "vue-router";

const checkedRowKeys = ref([]);

const getMenu = () => {
  const options: DropdownOption[] = [
    {
      label: "打开",
      key: "open",
    },
    {
      label: "在文件夹中查看",
      key: "find",
    },
    {
      label: "分享",
      key: "share",
      disabled: true,
    },
  ];
  return options;
};
const smallColums = ref<DataTableColumns>([
  {
    title: "创建时间",
    key: "created_time",
    sorter: "default",
    render: (row) => {
      return h(NTime, {
        time: new Date(String(row.created_time) || ""),
        format: "yy-MM-dd HH:mm:ss.SSS",
      });
    },
    className: "modified_time",
    width: 170,
  },
]);
const columns = ref<DataTableColumns>([
  {
    type: "selection",
  },
  {
    title: "名称",
    key: "file_name",
    //合并此列表头与下一列表头
    titleColSpan: 2,
    //根据key的值来决定对什么排序
    sorter: "default",
    render: (row: any) => {
      if (
        row.mime_type.indexOf("video") != -1 ||
        row.mime_type.indexOf("image") != -1
      ) {
        return h(NImage, {
          width: 28,
          height: 28,
          src:
            row.reference_resource.thumbnail_link ||
            row.reference_resource.icon_link,
        });
      } else {
        return h("img", {
          width: 28,
          height: 28,
          src:
            row.reference_resource.thumbnail_link ||
            row.reference_resource.icon_link,
        });
      }
    },
    width: 48,
  },
  {
    title: "名称",
    key: "file_name",
    sorter: "default",
    render: (row: any) => {
      return h(
        "div",
        {
          class: "file-info",
        },
        [
          h(
            NEllipsis,
            {
              class: "title",
            },
            {
              default: () => String(row.reference_resource.name),
            },
          ),
          h(
            "span",
            {
              class: "action",
            },
            "1",
          ),
        ],
      );
    },
  },
  {
    title: "大小",
    key: "size",
    sorter: (rowA: any, rowB: any) => {
      return rowA.reference_resource.size - rowB.reference_resource.size;
    },
    render: (row: any) =>
      Number(row.reference_resource.size) > 0
        ? byteConvert(Number(row.reference_resource.size))
        : "",
    className: "size",
    width: 100,
  },
]);
const router = useRouter();
const fileInfo = ref();
const showDropdown = ref(false);
const showVideo = ref(false);
const showImage = ref(false);
const handleSelect = (key: string) => {
  switch (key) {
    case "open":
      if (fileInfo.value.kind === "drive#folder") {
        router.push("/list/" + fileInfo.value.id);
      } else if (
        fileInfo.value.mime_type.indexOf("video") != -1 ||
        fileInfo.value.mime_type.indexOf("image") != -1 ||
        fileInfo.value.mime_type.indexOf("audio") != -1
      ) {
        getFile(fileInfo.value.id).then((res) => {
          fileInfo.value = res.data;
          if (fileInfo.value.web_content_link) {
            if (
              fileInfo.value.mime_type.indexOf("video") != -1 ||
              fileInfo.value.mime_type.indexOf("audio") != -1
            ) {
              fileInfo.value.web_content_link = refinePlayUrl(
                playConfig.value,
                fileInfo.value.web_content_link,
              );
              fileInfo.value.medias.forEach((item: any) => {
                item.link.url = refinePlayUrl(playConfig.value, item.link.url);
              });
              showVideo.value = true;
            } else {
              fileInfo.value.web_content_link = refineImageUrl(
                playConfig.value,
                fileInfo.value.web_content_link,
              );
              showImage.value = true;
            }
          }
          console.log(fileInfo.value.web_content_link);
        });
      }
      break;
    case "find":
      console.log(fileInfo.value);
      if (fileInfo.value.parent_id) {
        router.push("/list/" + fileInfo.value.parent_id);
      } else {
        router.push("/list/");
      }
      break;
    case "share":
      break;
  }
  showDropdown.value = false;
};
const onClickoutside = () => {
  showDropdown.value = false;
};
const x = ref(0);
const y = ref(0);
const rowProps = (row: any) => {
  return {
    onContextmenu: (e: MouseEvent) => {
      e.preventDefault();
      showDropdown.value = false;
      nextTick().then(() => {
        fileInfo.value = row.reference_resource;
        showDropdown.value = true;
        x.value = e.clientX;
        y.value = e.clientY;
      });
    },
  };
};
const pageToken = ref();
const filesEvents = ref();
const getEvents = () => {
  loading.value = true;
  http
    .get("https://api-drive.mypikpak.com/drive/v1/events", {
      params: {
        thumbnail_size: "SIZE_LARGE",
        limit: 100,
        page_token: pageToken.value || undefined,
      },
    })
    .then((res: any) => {
      const { data } = res;
      if (!pageToken.value) {
        filesEvents.value = [];
      }
      filesEvents.value = filesEvents.value.concat(data.events);
      pageToken.value = data.next_page_token;
    })
    .finally(() => {
      loading.value = false;
    });
};
/*未完成
const share = (id: string | string[]) => {
  http
    .post("https://api-drive.mypikpak.com/drive/v1/files:share", {
      ids: typeof id === "string" ? [id] : id,
    })
    .then(() => {
      getFileList();
    });
};*/
const loading = ref(false);
const scrollHandle = (e: any) => {
  if (e.target.offsetHeight - e.target.scrollTop < 30) {
    if (pageToken.value && !loading.value) {
      getEvents();
    }
  }
};
const playConfig = ref();
onMounted(() => {
  const width = document.body.clientWidth;
  if (width > 968) {
    columns.value.splice(3, 0, ...smallColums.value);
  }
  getEvents();
  let _pc = JSON.parse(window.localStorage.getItem("pikpakPlay") || "{}");
  playConfig.value = _pc;
});
</script>

<style>
.header {
  height: 40px;
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  justify-content: space-between;
  white-space: nowrap;
  flex-shrink: 0;
  font-size: 16px;
}
.header .title {
  flex: 1;
  width: 0;
  text-overflow: ellipsis;
  margin-right: 20px;
}
.header .action {
  font-size: 24px;
}
.n-data-table-td {
  cursor: pointer;
}
.n-data-table-td.modified_time,
.n-data-table-th.modified_time {
  color: rgba(34, 34, 34, 0.5);
}
.n-data-table-td.size,
.n-data-table-th.szie {
  color: rgba(34, 34, 34, 0.5);
}
.file-info {
  display: flex;
  align-items: center;
}
.file-info img {
  width: 28px;
  height: 28px;
  margin-right: 20px;
}
.file-info .title {
  flex: 1;
  width: 0;
}
.file-info .action {
  display: none;
}
.list-page {
  padding: 40px;
  user-select: none;
}
@media (max-width: 968px) {
  .list-page {
    padding: 10px;
    user-select: none;
  }
}
.list-page .loading {
  margin-top: 20px;
  text-align: center;
  color: rgba(37, 38, 43, 0.5);
}
.outer-wrapper {
  opacity: 0;
  position: absolute;
  left: 50%;
  bottom: 52px;
  transform: translateX(-50%);
  z-index: 5;
  transition: opacity 0.3s ease;
}
.outer-wrapper.static {
  animation: move-down ease 0.3s;
}
.outer-wrapper.show {
  opacity: 1;
}
.outer-wrapper.show.static {
  animation: move-up ease 0.3s;
}
.toolbar-wrapper {
  display: -ms-flexbox;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid #84848450;
  background: #000;
  overflow: visible;
  user-select: none;
  box-shadow:
    0 0 1px 1px rgba(28, 28, 28, 0.05),
    0 8px 24px rgba(28, 28, 28, 0.12);
}
.toolbar-item {
  border-radius: 5px;
  padding: 6px;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.3s ease;
  color: #fff;
  margin-left: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.toolbar-item:first-child {
  margin-left: 0;
}
.tool-icon {
  font-size: 18px;
}
@keyframes move-down {
  0% {
    bottom: 52px;
  }
  100% {
    bottom: -52px;
  }
}
@keyframes move-up {
  0% {
    bottom: -52px;
  }
  100% {
    bottom: 52px;
  }
}
</style>
