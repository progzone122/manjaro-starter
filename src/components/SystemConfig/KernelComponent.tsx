import {
  Box,
  CircularProgress,
  Flex,
  Skeleton,
  TagLabel,
  useColorModeValue,
  chakra,
  TagLeftIcon,
  Tag,
  IconButton,
  useToast,
  Spacer,
} from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';
import { FaLinux } from 'react-icons/fa';
import { RiAddLine } from 'react-icons/ri';
import { MdOutlineDownloadDone } from 'react-icons/md';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Command } from '@tauri-apps/api/shell';

interface Kernel {
  id: string;
  name: string;
  isInstalled:boolean;
}

const KernelComponent: React.FC = (props) => {
  const [kernelSt, setKernelSt] = useState<Kernel[]>();
  const [isLoadingKernel, setIsLoadingKernel] = useState<Map<string, boolean>>(new Map());
  const toast = useToast();
  const { t } = useTranslation();
  const getKernelList = async () => {
    const cmd = new Command('mhwd-kernel', ['-l']);
    const kernelList = await cmd.execute();
    const kernels = [] as Kernel[];
    const splitKernels = kernelList.stdout.split('*').filter((item) => item.indexOf('linux') > 0);
    await Promise.all(splitKernels.map(async (item) => {
      const kernelName = item.replace(/^\s+|\s+$/g, '').replaceAll('\"', '');
      const installedCmd = new Command('version-control', ['-Q', kernelName]);
      const kernelInstalled = await installedCmd.execute();
      let isInstalled = false;
      if (kernelInstalled.stdout) {
        isInstalled = true;
      }
      const kernel:Kernel = { id: _.uniqueId(), name: kernelName, isInstalled };
      kernels.push(kernel);
    }));
    return kernels;
  };
  const setKernelList = async () => {
    const kernelList:Kernel[] = await getKernelList();
    setKernelSt(kernelList);
  };
  const installKernel = async (kernelName:string) => {
    setIsLoadingKernel(new Map(isLoadingKernel?.set(kernelName, true)));
    const cmd = new Command('pamac', ['install', '--no-confirm', kernelName]);
    const cmdResult = await cmd.execute();
    setIsLoadingKernel(new Map(isLoadingKernel?.set(kernelName, false)));
    if (cmdResult.stdout) {
      const desc = cmdResult.stdout.replaceAll('"', '').replaceAll('\\u{a0}', ' ').split('\\n').map((item, index) => (
        <span>
          {item}
          <br />
        </span>
      ));
      toast({
        title: `${t('installing')} ${kernelName}`,
        description: desc,
        status: 'success',
        duration: 9000,
        isClosable: true,
        position: 'bottom-right',
      });
    } else {
      const desc = cmdResult.stderr.replaceAll('"', '').replaceAll('\\u{a0}', ' ').split('\\n').map((item, index) => (
        <span>
          {item}
          <br />
        </span>
      ));
      toast({
        title: kernelName,
        description: desc,
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'bottom-right',
      });
    }
    setKernelList();
    return cmdResult;
  };

  useEffect(() => {
    setKernelList();
  }, []);

  return (
    <Box mt={5} textAlign={{ lg: 'left' }}>

      <chakra.p
        mt={2}
        fontSize={{ base: '3xl', sm: '3xl' }}
        lineHeight="8"
        fontWeight="extrabold"
        letterSpacing="tight"
        color={useColorModeValue('white.900', 'white.100')}
      >
        {t('kernels')}
      </chakra.p>

      <chakra.p
        mt={4}
        maxW="2xl"
        fontSize="xl"
        color={useColorModeValue('gray.500', 'gray.400')}
      >
        {t('installKernel')}
      </chakra.p>
      <Skeleton isLoaded={kernelSt !== null}>
        {kernelSt && kernelSt.map((kernel) => (
          <Tag size="md" mr={5} mt={5} key={kernel.id} colorScheme={kernel.isInstalled ? 'whatsapp' : 'gray'}>
            <TagLeftIcon boxSize="12px" as={FaLinux} />
            <TagLabel>{kernel.name}</TagLabel>
            {!kernel.isInstalled ? <IconButton ml={5} mr={-2} aria-label="Install Kernel" onClick={() => installKernel(kernel.name)} isLoading={isLoadingKernel?.get(kernel.name) || false} icon={<RiAddLine />} /> : <IconButton ml={5} mr={-2} disabled aria-label="" icon={<MdOutlineDownloadDone />} />}
          </Tag>
        ))}
      </Skeleton>

    </Box>
  );
};
export default KernelComponent;
