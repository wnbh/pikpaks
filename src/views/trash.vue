<template>
  <div class="list-page">
    <div class="header">
      <div class="title n-ellipsis">
        <n-breadcrumb separator=">">
          <n-breadcrumb-item>
            <router-link to="">回收站</router-link>
          </n-breadcrumb-item>
        </n-breadcrumb>
      </div>
    </div>
    <n-data-table
      v-model:checked-row-keys="checkedRowKeys"
      :row-key="(row) => row.id"
      :data="filesTrash"
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
        <div class="toolbar-item" @click="unTransh(checkedRowKeys)">
          <n-tooltip>
            <template #trigger>
              <n-icon>
                <IconRecycle />
              </n-icon>
            </template>
            还原所选
          </n-tooltip>
        </div>
        <div class="toolbar-item" @click="deleteTransh(checkedRowKeys)">
          <n-tooltip>
            <template #trigger>
              <n-icon>
                <IconTrash />
              </n-icon>
            </template>
            删除所选
          </n-tooltip>
        </div>
      </div>
    </div>
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
  NIcon,
  NTooltip,
  NSpin,
  NImage,
  NDropdown,
  DropdownOption,
} from "naive-ui";
import { byteConvert } from "../utils";
import { IconRecycle, IconTrash } from "@tabler/icons-vue";

const checkedRowKeys = ref([]);

const getMenu = () => {
  const options: DropdownOption[] = [
    {
      label: "还原",
      key: "restore",
    },
    {
      label: "删除",
      key: "delete",
    },
  ];
  return options;
};
const smallColums = ref<DataTableColumns>([
  {
    title: "删除时间",
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
    key: "name",
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
            row.thumbnail_link ||
            row.icon_link,
        });
      } else {
        return h("img", {
          width: 28,
          height: 28,
          src:
            row.thumbnail_link ||
            row.icon_link,
        });
      }
    },
    width: 48,
  },
  {
    title: "名称",
    key: "name",
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
              default: () => String(row.name),
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
      return rowA.size - rowB.size;
    },
    render: (row: any) =>
      Number(row.size) > 0
        ? byteConvert(Number(row.size))
        : "",
    className: "size",
    width: 100,
  },
]);
const fileInfo = ref();
const showDropdown = ref(false);
const handleSelect = (key: string) => {
  switch (key) {
    case "restore":
      unTransh(String(fileInfo.value.id));
      break;
    case "delete":
      deleteTransh(String(fileInfo.value.id));
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
        fileInfo.value = row;
        showDropdown.value = true;
        x.value = e.clientX;
        y.value = e.clientY;
      });
    },
  };
};
const pageToken = ref();
const filesTrash = ref();
const getTrash = () => {
  loading.value = true
  http.get('https://api-drive.mypikpak.com/drive/v1/files', {
    params: {
      parent_id: '*',
      thumbnail_size: 'SIZE_LARGE',
      with_audit: true,
      limit: 100,
      page_token: pageToken.value || undefined,
      filters: '{"phase":{"eq":"PHASE_TYPE_COMPLETE"},"trashed":{"eq":true}}'
    }
  })
    .then((res:any) => {
      const {data} = res
      if(!pageToken.value) {
        filesTrash.value = []
      }
      filesTrash.value = filesTrash.value.concat(data.files)
      pageToken.value = data.next_page_token
    })
    .finally(() => {
      loading.value = false
    })
}
const deleteTransh = (id:string | string[]) => {
  http.post('https://api-drive.mypikpak.com/drive/v1/files:batchDelete', {
    ids: typeof id === 'string' ? [id] : id
  })
    .then(() => {
      window.$message.success('删除成功' , { duration: 1000 })
      checkedRowKeys.value = []
      getTrash()
    })
}
const unTransh = (id: string | string[]) => {
  http.post('https://api-drive.mypikpak.com/drive/v1/files:batchUntrash', {
    ids: typeof id === 'string' ? [id] : id
  })
    .then(() => {
      window.$message.success('已还原' , { duration: 1000 })
      checkedRowKeys.value = []
      getTrash()
    })
}
const loading = ref(false);
const scrollHandle = (e: any) => {
  if (e.target.offsetHeight - e.target.scrollTop < 30) {
    if (pageToken.value && !loading.value) {
      getTrash();
    }
  }
};
onMounted(() => {
  const width = document.body.clientWidth;
  if (width > 968) {
    columns.value.splice(3, 0, ...smallColums.value);
  }
  getTrash();
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
