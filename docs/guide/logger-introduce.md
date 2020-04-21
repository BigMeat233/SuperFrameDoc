# 日志输出器

## 输出器模型

[输出器模型](/images/test.png)

## 输出器配置

通常情况下，Corejs内置输出器实例化时需要配置**运行环境**、**最小输出等级**和**功能参数**构成的对象，即```{ env, level, params }```。

- 运行环境```env```：表示输出器当前的运行环境，默认值为```Core.Macro.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```。

  ::: tip 说明
  - 当运行环境为```Core.Macro.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，日志将统一输出到控制台。此功能借助继承基础输出器实现，在[自定义输出器](/guide/logger-customizing.html)时尽量遵守此规则。
  - 当运行环境不为```Core.Macro.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，日志将根据实际的输出器逻辑产生相应的输出行为。
  :::

- 最小输出等级```level```：输出器仅输出权重大于等于此等级的日志。

  ::: tip 说明
  - 当运行环境为```Core.Macro.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，默认值为：```all```。
  - 当运行环境不为```Core.Macro.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时，默认值为：```error```。
  - 若指定的最小输出等级无效时，则使用**默认日志等级**作为默认值，关于**默认日志等级**的说明见[输出等级](#输出等级)。
  :::

- 功能参数```params```：表示输出器的功能配置参数。功能参数将会被输出器缓存。允许将一些需要缓存的自定义参数放入此项中，**需要注意名称不要与功能配置参数冲突**。

## 输出等级

Corejs内置输出器支持在输出日志时使用**标准等级**和**标准等级别名**作为日志输出等级，权重从小到大依次为：

- 追踪日志：```'trace'```、```'t'```，权重：```10000```。
- 调试日志：```'debug'```、```'d'```，权重：```20000```。
- 信息日志：```'infos'```、```'info'```、```'i'```，权重：```30000```。
- 警告日志：```'warns'```、```'warn'```、```'w'```，权重：```40000```。
- 错误日志：```'error'```、```'err'```、```'e'```，权重：```50000```。
- 灾难日志：```'fatal'```、```'f'```，权重：```60000```。

Corejs内置输出器中使用两个**内部输出等级**，仅用于日志输出过滤：

- 开启所有日志：```all```、```a```，权重：```0```。
- 关闭所有日志：```off```、```o```，权重：```100000```。

::: tip 提示
可以通过在日志输出器的```level```配置中设置输出等级或别名，使输出器仅输出权重大于等于此等级的日志。
:::

Corejs内置输出器默认业务逻辑中需要使用**默认日志等级**、**默认警告日志等级**和**默认错误日志等级**。如果上述的三个输出等级未在配置项中指定或指定了无效值，则使用[等级选举规则](#等级选举规则)选举出的输出等级。

::: tip 使用场景
- 默认日志等级：在```log()```时未指定输出等级或指定了无效值时，使用此等级。
- 默认警告日志等级：在输出器内部需要输出警告信息时，使用此等级输出。
- 默认错误日志等级：在```log()```指定了Error类型日志内容时，将使用此等级。当输出权重大于等于此等级的日志时，将自动附加调用栈至日志内容中。
:::

## 等级选举

等级选举规则将在输出等级配置表中选举出默认日志等级、默认警告日志等级和默认错误日志等级。在**上述三个输出等级未在配置项中指定或指定了无效值**时，使用选举出的等级。

选举规则为：

- 枚举输出等级配置表，在配置了```level.default```为```true```的日志输出等级中选择权重最大者作为**默认等级**。
- 若上述步骤中未能选举出**默认等级**，则选举输出等级配置表中**权重居中**的等级作为**默认等级**。
- 若权重居中的等级有两个，则选择**权重较小者（两者中前者）**作为**默认等级**。
- 选举比**默认等级**权重**大一个梯度**的输出等级（即输出等级配置表按权重升序排列后位于**默认等级**后一个位置的输出等级）作为**默认警告等级**。
- 若上述步骤中未能选举出**默认警告等级**，则使用**默认等级**作为**默认警告等级**。
- 选举比**默认等级**权重**大二个梯度**的输出等级（即输出等级配置表按权重升序排列后位于**默认等级**后二个位置的输出等级）作为**默认错误等级**。
- 若上述步骤中未能选举出**默认错误等级**，则使用**默认警告等级**作为**默认错误等级**。

## 基础输出器

基础输出器将日志输出到控制台，**一般不在生产环境中使用**。[自定义输出器](/guide/logger-customizing.html)时需要继承基础输出器。

### 功能说明

- 日志输出至控制台。
- **支持输出器自启动**，即实例化后自动执行```start()```启动输出器，通常无需显式执行```start()```。
- ```start()```、```close()```和```log()```中内置状态检测机制（可通过配置调整，默认打开）。

  ::: tip 说明
  - 执行```start()```时：检测输出器是否已处于启动状态，若输出器已启动则此次```start()```将会输出警告日志。
  - 执行```close()```时：检测输出器是否已处于关闭状态，若输出器已关闭则此次```close()```将会输出警告日志。
  - 执行```log()```时：检测输出器是否处于启动状态，若输出器未启动则此次```log()```将会输出警告日志。

  > 可通过修改内置宏调整默认警告日志文案：
  >   - ```Core.Message.BASE_LOGGER_MESSAGE_CANT_LOG```：无法执行```log()```警告文案。
  >   - ```Core.Message.BASE_LOGGER_MESSAGE_CANT_START```：无法执行```start()```警告文案。
  >   - ```Core.Message.BASE_LOGGER_MESSAGE_CANT_CLOSE```：无法执行```close()```警告文案。
  :::

- 支持使用多种调用方式快捷打印日志。

  ::: tip 说明
  - ```log(message)```：根据日志内容智能选择日志输出等级，且根据当前调用栈获取调用方法名。
  - ```log(level, message)```：使用指定日志等级（别名）输出日志，且根据当前调用栈获取调用方法名。
  - ```log(level, funcName, message)```：使用指定日志等级（别名）和指定方法名输出日志。

  > ·执行```log(message)```时，输出器根据```message```类型自动选择日志输出等级：
  >   - ```message```为```Error```类型：使用**默认错误等级**输出日志。
  >   - ```message```为其他类型：使用**默认等级**输出日志。
  :::

  ::: warning 注意
  调用```log()```时，如果输出等级权重大于等于**默认错误等级**时，将在日志内容中附加当前调用栈。
  - 日志内容为Error类型时，使用Error的调用栈。
  - 日志内容为其他类型是，使用当前调用栈，可通过设置输出器```callStackOffset```配置调整调用栈偏移。
  :::

- 日志内容输出格式：

   **[<%YYYY-MM-DD HH:mm:ss.SSS+ZZZZ%>] [<%ENV%> LOG] [<%LEVEL%>] - <<%FUNC_NAME%>><<%MESSAGE%>\n<%CALL_STACK%>\n>**

   > 其中:
   >   - <%YYYY-MM-DD HH:mm:ss.SSS+ZZZZ%> - 时间戳字符串
   >   - <%ENV%> - 当前环境
   >   - <%LEVEL%> - 日志输出等级
   >   - <%FUNC_NAME%> - 调用方法
   >   - <%MESSAGE%> - 日志文案
   >   - <%CALL_STACK%> - 调用栈

### 功能参数

- #### ```defaultLevel```

  构造实例传入```configs.param.defaultLevel```或修改输出器的```_defaultLevel```属性时将设置**默认等级**，默认值为：```null```。

  此配置可以使用输出器输出等级支持列表中等级的全称或别名，当配置的输出等级不在支持列表中或配置为```null```时表示使用[等级选举](#等级选举)得出的默认等级。

  ::: tip 使用默认等级的场景
  - 构造输出器时配置的最小输出等级无效。
  - 执行```log(message)```时，传入的日志内容不为```Error```类型。
  - 执行```log(level, message)```时，传入的输出等级无效（即：输出等级不在输出器输出等级支持列表中）。
  - 执行```log(level, funcName, message)```时，传入的输出等级无效（即：输出等级不在输出器输出等级支持列表中）。
  :::

- #### ```defaultWarnsLevel```

  构造实例传入```configs.param.defaultWarnsLevel```或修改输出器的```_defaultWarnsLevel```属性时将设置**默认警告等级**，默认值为：```null```。

  此配置可以使用输出器输出等级支持列表中等级的全称或别名，当配置的输出等级不在支持列表中或配置为```null```时表示使用[等级选举](#等级选举)得出的默认警告等级。

  ::: tip 使用默认警告等级的场景
  执行```start()```、```close()```、```log()```过程中，状态校验失败时输出的警告日志使用默认警告等级输出。
  :::

- #### ```defaultErrorLevel```

  构造实例传入```configs.param.defaultErrorLevel```或修改输出器的```_defaultErrorLevel```属性时将设置**默认错误等级**，默认值为：```null```。

  此配置可以使用输出器输出等级支持列表中等级的全称或别名，当配置的输出等级不在支持列表中或配置为```null```时表示使用[等级选举](#等级选举)得出的默认错误等级。

  ::: tip 使用默认错误等级的场景
  - 执行```log(message)```时，传入的日志内容为```Error```类型。
  - 执行```log(level, message)```时，传入的输出等级有效且权重大于等于默认错误等级权重时，将自动在日志文案中附加调用栈。
  - 执行```log(level, funcName, message)```时，传入的输出等级有效且权重大于等于默认错误等级权重时，将自动在日志文案中附加调用栈。
  :::

- #### ```callStackOffset```

  构造实例传入```configs.param.callStackOffset```或修改输出器的```_callStackOffset```属性时将设置调用栈偏移，默认值为：```Core.Macro.BASE_LOGGER_DEFAULT_CALLSTACK_OFFSET```。

  此配置影响使用```buildCallSnapshot()```生成当前上下文调用信息时的调用栈，一般情况下使用```Core.Macro.BASE_LOGGER_DEFAULT_CALLSTACK_OFFSET```作为偏移基数，执行自增或自减得到实际的调用栈偏移。

  ::: tip 提示
  当日志内容为```Error```类型时通过```buildCallSnapshot(message)```生成的调用栈不会受此配置影响。
  :::

- #### ```_checkStateInLog```

  构造实例传入```configs.param._checkStateInLog```或修改输出器的```_checkStateInLog```属性时将控制输出器在执行```log()```时是否检查当前状态，若输出器未处于启动状态将输出警告日志，默认值为：```true```。

- #### ```_checkStateInStart```

  构造实例传入```configs.param._checkStateInStart```或修改输出器的```_checkStateInStart```属性时将控制输出器在执行```start()```时是否检查当前状态，若输出器已处于启动状态将输出警告日志，默认值为：```true```。

- #### ```_checkStateInClose```

  构造实例传入```configs.param._checkStateInClose```或修改输出器的```_checkStateInClose```属性时将控制输出器在执行```close()```时是否检查当前状态，若输出器已处于关闭状态将输出警告日志，默认值为：```true```。

### 样例代码

```javascript
const Core = require('node-corejs');
// 构造输出器
const logger = new Core.BaseLogger({
  env: 'prod',
  level: 'all',
  params: { defaultLevel: 'debug' }
});

// 输出日志至控制台
logger.log('debug'); // 因配置了defaultLevel为debug,故此条日志使用debug作为默认输出等级
logger.log('t', 'trace', 'trace日志');
logger.log('i', 'infos', 'infos日志');
logger.log('w', 'warns', 'warns日志');
logger.log('e', 'error', 'error日志');
logger.log('f', 'fatal', 'fatal日志');
logger.log(new Error('error日志'));
```

## 日期输出器

日期输出器继承自基础输出器，在运行环境为```Core.Macro.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时与基础输出器表现行为一致。在其他运行环境下，将**按照配置的日期周期归档日志**。支持同一周期内**日志文件分割**、**过期文件自动清理**等辅助功能。

::: tip 提示
日期输出器通常用于按照周期收集日志的场景，比如将每天产生的日志归档至同一文件（组）中。
:::

**日期输出器支持基础输出器的所有配置和功能，本章中描述的内容仅为增量内容。**

### 功能说明

- 日志按照周期归档至文件中。

  ::: tip 说明
  通过配置```dateFormat```调整归档周期，同一周期内的日志将输出到相同的文件（组）中。支持以月、日、时、分、秒(因年周期过长，故不支持)作为归档周期。
  :::

- 支持同周期内日志文件自动分割。
- 支持设置保留周期个数，自动清理过期日志文件。
- 支持设置归档路径，归档文件名规则。

  ::: tip 关于归档路径和文件名
  归档路径可能由**源路径**和**归档前缀**构成；归档文件名可能由**归档前缀**、**归档周期**、**归档偏移**和**文件后缀**构成。
  
  **归档文件名构成为：<%归档前缀%>.<%归档周期%>.<%归档偏移%>.<%文件后缀%>**。

  - 归档文件名中一定包含**归档周期**。
  - 启用文件分割时将附加**归档偏移**。
  - 过配置项控制是否附加**归档前缀**和**文件后缀**至文件名。
  :::

- 输出异常时保证日志完整性。
  
  ::: tip 说明
  - 当日期输出器产生阻塞级异常（比如：无法创建目录、无法创建文件等）时，运行环境降级为```Core.Macro.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```运行。
  - 当日期输出器产生异常警告时（比如：非法调用、状态错误等）时，将输出警告日志到控制台，但不导致运行环境降级。
  :::

### 功能参数

- #### ```sourcePath```

  构造实例时传入```configs.params.sourcePath```将设置日志归档目录，默认值为```path.resolve(process.cwd(), `./logs/${process.pid}`)```。

  ::: warning 注意
  - 在cluster模式下，为避免多进程抢夺相同资源导致异常，推荐在```sourcePath```中包含进程标识。
  - 若目录不存在，日期输出器将在实例化过程中自动创建。归档目录中不允许使用```<?*"|>```这6个字符，将会被替换为```'_'```。
  :::

- #### ```filePrefix```

  构造实例时传入```configs.params.filePrefix```将设置日志归档前缀，默认值为```''```。
  
  **文件前缀可配置为归档文件名或归档目录的一部分**，故不能使用```<\.:?*"|/>```这十个字符，将会自动被替换为```'_'```。

  在执行文件分割或旧文件清理时将对```filePrefix```相同的文件进行归类和计数，**归档文件名中没有归档前缀时，统一认为```filePrefix```为空字符串**。

  ::: warning 注意
  此配置项的值将极大的影响后续配置，需要注意日期输出器将会自动确保以下参数规则：

  - 当此配置项未配置或配置为```''```时，将会锁定```filePrefixAsSourcePath```、```filePrefixAsFileName```为```false```。
  - 当此配置有效时，则```filePrefixAsSourcePath```和```filePrefixAsFileName```必须至少有一项为```true```。
    > 此时，若两项都配置为```false```，日期输出器将锁定```filePrefixAsSourcePath```为```true```。
  :::
  
  ::: tip 提示
  推荐不同的日期输出器配置不同的```filePrefix```，且开启```filePrefixAsSourcePath```选项。日期输出器输出日志时将根据```filePrefix```将不同输出器生成的日志文件归档至不同目录，使目录结构更加明确。另外，执行日志文件统计（分割/清理计算）时，认为目录中全部文件具有相同```filePrefix```，统计效率更高。

  - 执行大文件分割时，将通过```sourcePath```下所有**归档前缀**和**归档日期**相同的文件进行计数，计算下一个归档文件的**归档偏移**。
  - 执行旧文件清理时，将通过```sourcePath```下所有**归档前缀**相同的文件进行归档日期过滤，删除已过时的旧文件(归档日期下的所有文件即所有分割文件都将被删除)。
  :::

- #### ```filePrefixAsSourcePath```

  构造实例时传入```configs.params.filePrefixAsSourcePath```将在日志归档路径后附加归档前缀，即将文件归档至```sourcePath/filePrefix```默认值为```true```。

  ::: warning 注意
  需要注意日期输出器将会自动确保以下规则：

  - 当```filePrefix```未配置或配置为```''```时，将会锁定此配置为```false```。
  - 当```filePrefix```配置有效时，日期输出器将在```filePrefixAsFileName```配置为```false```时，锁定此配置为```true```。
  :::

- #### ```filePrefixAsFileName```

  构造实例时传入```configs.params.filePrefixAsFileName```将在日志归档文件名中附加归档前缀，默认值为```true```。

  ::: warning 注意
  需要注意日期输出器将会自动确保以下规则：

  - 当```filePrefix```未配置或配置为```''```时，将会锁定此配置为```false```。
  - 当```filePrefix```配置有效时，日期输出器将在此配置为```false```时，锁定```filePrefixAsSourcePath```为```true```。
  :::

- #### ```dateFormat```
  
  构造实例时传入```configs.params.dateFormat```将指定日期输出器的归档周期和归档周期的日期格式，默认值为```YYYY-MM-DD```。
  
  **归档时间将根据此格式附加至日志文件名中**，故不能使用```<\.:?*"|/>```这十个字符,将会被替换为```'_'```。

  ::: tip 提示
  日期输出器支持以月、日、时、分、秒（因年周期过长，故不支持）作为归档周期。可以使用日期元素：
  
  - 年：```'YYYY'```
  - 月：```'MM'```
  - 日：```'DD'```
  - 时：```'HH'```
  - 分：```'mm'```
  - 秒：```'ss'```
  :::

  ::: danger 注意
  构造```dateFormat```必须使用递进的方式组合**日期元素**，即设置的归档单位必须包含其前置单位，比如：

  - 选择**月**作为归档周期时，可以配置```dateFormat```为```'YYYY-MM'```，即必须包含```'YYYY'```作为前置单位。
  - 选择**分**作为归档周期时，可以配置```dateFormat```为```'YYYY-MM-DD_HH_mm'```，必须包含```'YYYY'```、```'MM'```、```'DD'```、```'HH'```、```'mm'```作为前置单位。
  :::

- #### ```keepDateNum```

  构造实例时传入```configs.params.keepDateNum```将指定保留周期数量，设置为小于等于0的值时将关闭自动清理，默认值为```0```。

  ::: tip 提示
  执行旧文件清理时，将通过```sourcePath```下所有**归档前缀**相同的文件进行归档日期过滤，删除已过时的旧文件(归档日期下的所有文件即所有分割文件都将被删除)。在开启了```filePrefixAsSourcePath```选项时，**清理引擎**认为```sourcePath/filePrefix```中全部文件具有相同的**归档前缀**，执行效率更高。
  :::

  ::: warning 注意
  清理时将保留含当前日期在内的最近```keepDateNum```个周期内的归档文件。比如：当前有```2011-01.log```、```2011-02.log```、```2011-05.log```、```2011-08.log```、```2011-10.log```五个归档文件，当前是2011年10月且```keepDateNum```为```2```时，则保留```2011-10.log```、```2011-08.log```两个归档文件。
  :::

- #### ```maxSize```
  
  构造实例时传入```configs.params.maxSize```将指定分割文件时最大文件体积，单位为```Byte```，设置为小于等于0的值时将关闭自动分割，默认值为```0```。

  启动文件分割后，归档文件名中将出现**归档偏移**，日期输出器通过```sourcePath```下所有**归档前缀**和**归档日期**相同的文件进行计数，计算下一个归档文件的**归档偏移**。

  ::: tip 提示
  开启了```filePrefixAsSourcePath```选项时，**清理引擎**认为```sourcePath/filePrefix```中全部文件具有相同的**归档前缀**，此时仅执行**归档日期**过滤，效率更高。
  :::

- #### ```keepFileExt```

  构造实例时传入```configs.params.keepFileExt```将指定是否给归档文件附加```.log```拓展名，默认值为```true```。

### 样例代码

```javascript
const Core = require('node-corejs');
// 构造输出器
const logger = new Core.DateLogger({
  env: 'prod',
  level: 'infos',
  params: {
    // 日志输出目录: ./logs/DateLogger_Test/
    // 日志文件名称: DateLogger_Test.[归档时间].[归档偏移].log
    // 日志归档规则: 保留最后5秒内的日志文件,每个日志文件不超过1K
    sourcePath: './logs',
    filePrefix: 'DateLogger_Test',
    filePrefixAsSourcePath: true,
    filePrefixAsFileName: true,
    keepFileExt: true,
    dateFormat: 'YYYY-MM-DD_HH_mm_ss',
    keepDateNum: 5,
    maxSize: 1024
  },
});

// 输出日志至文件
let count = 0;
setInterval(() => {
  count += 1;
  logger.log(new Error(`测试日志 -> [${count}]`));
}, 100);
```

## 文件输出器

文件输出器继承自基础输出器，在运行环境为```Core.Macro.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```时与基础输出器表现行为一致。在其他运行环境下，将输出器输出的全部日志归档至**配置项指定的文件**。支持**日志分类**、**过期文件自动清理**等辅助功能。

::: tip 提示
文件输出器通常用于业务链路日志收集的场景，比如将用户每次请求产生的日志归档至同一文件。一般在业务中设置文件输出器的参数生成规则，使同一业务的日志归档至相同目录下。
:::

**文件输出器支持基础输出器的所有配置和功能，本章中描述的内容仅为增量内容。**

### 功能说明

- 输出器输出的所有日志归档至同一文件中。
- 支持手动/自动模式管理输出器资源。
  
  ::: tip 说明
  - 自动模式：输出器自动执行```start()```和```close()```控制资源创建和释放。在执行```log()```时，输出器将检测当前状态，若未开启则自动执行```start()```启动输出器并执行日志输出；在```timeout```配置的时间内如果没有任何日志输出则调用```close()```释放资源。
  > 自动模式下无需手动调用```start()```和```log()```，若强行调用将会输出警告日志。
  - 手动模式：输出器不自动执行```start()```和```close()```，需要手动显示调用。
  > 手动模式下执行```log()```时，输出器将检测当前状态，如果状态不匹配将会输出警告日志。
  :::

- 支持日志文件分类归档。

  ::: tip 关于归档路径和文件名
  归档路径可能由**源路径**、**归档前缀**、**归档日期**构成；归档文件名可能由**归档前缀**、**归档日期**、**归档文件名**、**归档类型**和**文件后缀**构成。
  
  **归档文件名构成为：<%归档前缀%>.<%归档文件名%>.<%归档日期%>.\[<%归档类型%>\].<%文件后缀%>**。

  - 归档文件名中一定包含**归档文件名**。
  - 当**文件名结构为<%归档文件名%>.<%归档日期%>时**，将自动附加**归档类型**为```[FN]```。
  - 当**文件名结构为<%归档前缀%>.<%归档文件名%>时**，将自动附加**归档类型**为```[FP]```。
  - 通过配置项可以控制是否附加**归档前缀**、**归档日期**至归档目录路径。
  - 通过配置项可以控制是否附加**归档前缀**、**归档日期**和**文件后缀**至文件名。
  :::

- 支持设置保留日期个数，自动清理过期日志文件。
- 输出异常时保证日志完整性。
  
  ::: tip 说明
  - 当文件输出器产生阻塞级异常（比如：无法创建目录、无法创建文件等）时，运行环境降级为```Core.Macro.BASE_LOGGER_DEVELOPMENT_ENVIRONMENT```运行。
  - 当文件输出器产生异常警告时（比如：非法调用、状态错误等）时，将输出警告日志到控制台，但不导致运行环境降级。
  :::

### 功能参数

- #### ```sourcePath```

  构造实例时传入```configs.params.sourcePath```将设置日志归档目录，默认值为```path.resolve(process.cwd(), `./logs/${process.pid}`)```。

  ::: warning 注意
  - 在cluster模式下，为避免多进程抢夺相同资源导致异常，推荐在```sourcePath```中包含进程标识。
  - 若目录不存在，文件输出器将在实例化过程中自动创建。归档目录中不允许使用```<?*"|>```这6个字符，将会被替换为```'_'```。
  :::

- #### ```fileName```
  
  构造实例时传入```configs.params.fileName```将设置日志归档文件名，默认值为```_generateFileName()```。

  ::: danger 注意
  归档文件名并不是最终实际输出的文件名，只是作为一个最终实际文件名的构造元素。故不能使用```<\.:?*"|/>```这十个字符，将会自动被替换为```'_'```。若没有传入此配置项，则根据进程标识、时间戳和8位随机小写字母和数字生成16长度的字符串作为文件名，即```_generateFileName()```。
  :::

- #### ```auto```

  构造实例时传入```configs.params.auto```将设置是否启动自动模式，默认值为```true```。

- #### ```timeout```

  构造实例时传入```configs.params.timeout```将设置输出器自动释放资源的等待时间，单位为毫秒，默认值为```10000```。

  ::: warning 注意
  ```timeout```配置仅在**自动模式**下生效，在**手动模式**下将锁定为```0```。
  :::

- #### ```filePrefix```

  构造实例时传入```configs.params.filePrefix```将设置日志归档前缀，默认值为```''```。
  
  **文件前缀可配置为归档文件名或归档目录的一部分**，故不能使用```<\.:?*"|/>```这十个字符，将会自动被替换为```'_'```。

  在执行旧文件清理时将对```filePrefix```相同的文件进行归类和计数，**归档文件名中没有归档前缀时，统一认为```filePrefix```为空字符串**。

  ::: warning 注意
  此配置项的值将极大的影响后续配置，需要注意文件输出器将会自动确保以下参数规则：

  - 当此配置项未配置或配置为```''```时，将会锁定```filePrefixAsSourcePath```、```filePrefixAsFileName```、```dateAsSourcePath```为```false```。
  - 当此配置有效时，则```filePrefixAsSourcePath```和```filePrefixAsFileName```必须至少有一项为```true```。
    > 此时，若两项都配置为```false```，文件输出器将锁定```filePrefixAsSourcePath```为```true```。
  :::
  
  ::: tip 提示
  推荐同类文件输出器配置相同的```filePrefix```，且开启```filePrefixAsSourcePath```选项。文件输出器输出日志时将根据```filePrefix```将不同类的输出器生成的日志文件归档至不同目录，使目录结构更加明确。另外，执行日志文件统计（清理计算）时，认为目录中全部文件具有相同```filePrefix```，统计效率更高。
  :::

- #### ```filePrefixAsSourcePath```

  构造实例时传入```configs.params.filePrefixAsSourcePath```将在日志归档路径后附加归档前缀，即将文件归档至```sourcePath/filePrefix```默认值为```true```。

  ::: warning 注意
  需要注意文件输出器将会自动确保以下规则：

  - 当```filePrefix```未配置或配置为```''```时，将会锁定此配置为```false```。
  - 当```filePrefix```配置有效时，文件输出器将在```filePrefixAsFileName```配置为```false```时，锁定此配置为```true```。
  :::

- #### ```filePrefixAsFileName```

  构造实例时传入```configs.params.filePrefixAsFileName```将在日志归档文件名中附加归档前缀，默认值为```true```。

  ::: warning 注意
  需要注意文件输出器将会自动确保以下规则：

  - 当```filePrefix```未配置或配置为```''```时，将会锁定此配置为```false```。
  - 当```filePrefix```配置有效时，文件输出器将在此配置为```false```时，锁定```filePrefixAsSourcePath```为```true```。
  :::

- #### ```dateFormat```
  
  构造实例时传入```configs.params.dateFormat```将指定文件输出器的日期格式，默认值为```YYYY-MM-DD```。
  
  **归档日期可配置为归档文件名或归档目录的一部分**，故不能使用```<\.:?*"|/>```这十个字符，将会自动被替换为```'_'```。

  ::: warning 注意
  此配置项的值将极大的影响后续配置，需要注意文件输出器将会自动确保以下参数规则：

  - 当此配置项未配置或配置为```''```时，将会锁定```dateAsSourcePath```、```dateAsFileName```为```false```。
  - 当此配置有效时，则```dateAsSourcePath```和```dateAsFileName```必须至少有一项为```true```。
    > 此时有两种情况：
    > - 若两项都配置为```false```，文件输出器将锁定```filePrefixAsSourcePath```为```true```。
    > - 若```dateAsSourcePath```因```filePrefix```或```filePrefixAsSourcePath```配置被锁定为```false```，则锁定```dateAsFileName```为```true```。
  :::

  ::: tip 提示
  一般通过启用```dateAsSourcePath```选项，将某个时间周期内的日志归档至同一目录下。支持以月、日、时、分、秒（因年周期过长，故不支持）作为归档周期。可以使用日期元素：
  
  - 年：```'YYYY'```
  - 月：```'MM'```
  - 日：```'DD'```
  - 时：```'HH'```
  - 分：```'mm'```
  - 秒：```'ss'```
  :::

  ::: danger 注意
  因执行旧日志清理依赖于时间先后，故构造```dateFormat```必须使用递进的方式组合**日期元素**，即设置的归档单位必须包含其前置单位，比如：

  - 选择**月**作为归档周期时，可以配置```dateFormat```为```'YYYY-MM'```，即必须包含```'YYYY'```作为前置单位。
  - 选择**分**作为归档周期时，可以配置```dateFormat```为```'YYYY-MM-DD_HH_mm'```，必须包含```'YYYY'```、```'MM'```、```'DD'```、```'HH'```、```'mm'```作为前置单位。
  :::

- #### ```dateAsSourcePath```

  构造实例时传入```configs.params.dateAsSourcePath```将在当前日志归档路径后附加归档日期，即将文件归档至```sourcePath/filePrefix/fileDate```默认值为```true```。

  ::: warning 注意
  需要注意文件输出器将会自动确保以下规则：

  - 当```dateFormat```未配置或配置为```''```时，将会锁定此配置为```false```。
  - 当```dateFormat```配置有效时，文件输出器将在```dateAsFileName```配置为```false```时，锁定此配置为```true```。
  - 当```dateFormat```配置有效时，若此配置因```filePrefix```或```filePrefixAsSourcePath```配置被锁定为```false```，则锁定```dateAsFileName```为```true```。
  - 当```filePrefixAsSourcePath```为```false```时，将会锁定此配置项为```false```，即**不允许直接在```sourcePath```下创建```fileDate```目录**。
  - 当```filePrefix```未配置或配置为```''```时，将会锁定此配置为```false```。
    > 因联动关系导致，```filePrefix```未配置或配置为```''```将会锁定```filePrefixAsSourcePath```为```false```，而```filePrefixAsSourcePath```为```false```会锁定此配置为```false```。
  :::

- #### ```dateAsFileName```

  构造实例时传入```configs.params.dateAsFileName```将在日志归档文件名中附加归档日期，默认值为```true```。

  ::: warning 注意
  需要注意文件输出器将会自动确保以下规则：

  - 当```dateFormat```未配置或配置为```''```时，将会锁定此配置为```false```。
  - 当```dateFormat```配置有效时，文件输出器将在此配置为```false```时，锁定```dateAsSourcePath```为```true```。
  - 当```dateFormat```配置有效时，若```dateAsSourcePath```因```filePrefix```或```filePrefixAsSourcePath```配置被锁定为```false```，则锁定此配置项为```true```。
  :::

- #### ```keepDateNum```

  构造实例时传入```configs.params.keepDateNum```将指定保留日期数量，设置为小于等于0的值时将关闭自动清理，默认值为```0```。

  ::: tip 提示
  执行旧文件清理时，将通过```sourcePath```下所有**归档前缀**相同的文件进行归档日期过滤，删除已过时的旧文件。
  
  - 开启```dateAsSourcePath```选项时，**清理引擎**认为```sourcePath/filePrefix```下的目录为**归档日期**，执行效率更高。
  - 开启```filePrefixAsSourcePath```选项时，**清理引擎**认为```sourcePath/filePrefix```中全部文件具有相同的**归档前缀**，执行效率更高。
  :::

  ::: warning 注意
  清理时将保留含当前日期在内的最近```keepDateNum```个周期内的归档文件。比如：当前有```2011-01.log```、```2011-02.log```、```2011-05.log```、```2011-08.log```、```2011-10.log```五个归档文件，当前是2011年10月且```keepDateNum```为```2```时，则保留```2011-10.log```、```2011-08.log```两个归档文件。
  :::

- #### ```keepFileExt```

  构造实例时传入```configs.params.keepFileExt```将指定是否给归档文件附加```.log```拓展名，默认值为```true```。

### 样例代码

```javascript
const Core = require('node-corejs');

let count = 0;
setInterval(() => {
  count += 1;
  // 构造输出器 - 将每秒的日志归档至同一目录,并保留最后5秒内的日志文件
  const logger = new Core.FileLogger({
    env: 'prod',
    level: 'infos',
    params: {
      // 日志输出目录: ./logs/FileLogger_Test/[归档时间]/
      // 日志文件名称: FileLogger_Test.[归档文件名].[归档时间].log
      // 日志归档规则: 保留最后5秒内的日志文件
      sourcePath: './logs',
      auto: true,
      timeout: 5000,
      filePrefix: 'FileLogger_Test',
      filePrefixAsSourcePath: true,
      filePrefixAsFileName: true,
      dateFormat: 'YYYY-MM-DD_HH_mm_ss',
      dateAsSourcePath: true,
      dateAsFileName: true,
      keepDateNum: 5,
      keepFileExt: true,
    },
  });
  logger.log(new Error(`测试日志 -> ${count}`));
  logger.log(new Error(`测试日志 -> ${count}`));
  logger.log(new Error(`测试日志 -> ${count}`));
  logger.log(new Error(`测试日志 -> ${count}`));
  logger.log(new Error(`测试日志 -> ${count}`));
}, 100);
```
