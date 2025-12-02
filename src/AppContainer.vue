<template>
    <n-message-provider>
        <App/>
    </n-message-provider>
</template>

<script setup>
import App from './App.vue';
import { NMessageProvider, NConfigProvider, darkTheme } from 'naive-ui';
</script>