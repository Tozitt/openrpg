import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { useEffect, useRef, useState } from 'react';
import Fade from 'react-bootstrap/Fade';
import Image from 'react-bootstrap/Image';
import useSocket, { SocketIO } from '../../hooks/useSocket';
import styles from '../../styles/modules/Portrait.module.scss';
import { DiceResult, ResolvedDice, sleep } from '../../utils';
import { Environment, PortraitConfig, PortraitOrientation } from '../../utils/config';
import prisma from '../../utils/database';

function getAttributeStyle(color: string) {
    return {
        color: 'white',
        textShadow: `0 0 10px #${color}, 0 0 30px #${color}, 0 0 50px #${color}`
    };
}

function getOrientationStyle(orientation: PortraitOrientation) {
    switch (orientation) {
        case 'center': return styles.center;
        case 'top': return styles.top;
        case 'bottom': return styles.bottom;
        default: return styles.center;
    }
}

export default function CharacterPortrait(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const [attributes, setAttributes] = useState(props.attributes);
    const [attributeStatus, setAttributeStatus] = useState(props.attributeStatus);
    const [sideAttribute, setSideAttribute] = useState(props.sideAttribute);
    const [playerName, setPlayerName] = useState(props.playerName.value);
    const [environment, setEnvironment] = useState(props.environment);
    const [socket, setSocket] = useState<SocketIO | null>(null);

    const diceQueue = useRef<DiceResult[]>([]);
    const diceData = useRef<DiceResult>();

    const [showDice, setShowDice] = useState(false);
    const showDiceRef = useRef(showDice);
    showDiceRef.current = showDice;

    const [diceResult, setDiceResult] = useState(0);
    const [diceResultShow, setDiceResultShow] = useState(false);
    const [diceDescription, setDiceDescription] = useState('');
    const [diceDescriptionShow, setDiceDescriptionShow] = useState(false);

    const [src, setSrc] = useState('#');
    const previousStatusID = useRef(0);

    const diceVideo = useRef<HTMLVideoElement>(null);

    const [showAvatar, setShowAvatar] = useState(false);

    useSocket(socket => {
        setSocket(socket);
        socket.emit('roomJoin', `portrait${props.playerId}`);
    });

    useEffect(() => {
        if (!socket) return;

        socket.on('environmentChange', setEnvironment);

        socket.on('attributeChange', (playerId, attributeId, value, maxValue) => {
            if (playerId !== props.playerId) return;

            setAttributes(attributes => {
                const index = attributes.findIndex(attr => attr.Attribute.id === attributeId);
                if (index === -1) return attributes;

                const newAttributes = [...attributes];

                if (value !== null) newAttributes[index].value = value;
                if (maxValue !== null) newAttributes[index].maxValue = maxValue;

                return newAttributes;
            });

            if (value === null) return;
            setSideAttribute(attr => {
                if (attr === null || attributeId !== attr.Attribute.id) return attr;
                return { value: value, Attribute: { ...attr.Attribute } };
            });
        });

        socket.on('attributeStatusChange', (playerId, attrStatusID, value) => {
            if (playerId !== props.playerId) return;
            setAttributeStatus(status => {
                const newAttrStatus = [...status];
                const index = newAttrStatus.findIndex(stat => stat.attribute_status_id === attrStatusID);
                if (index === -1) return status;

                newAttrStatus[index].value = value;

                const newStatusID = newAttrStatus.find(stat => stat.value)?.attribute_status_id || 0;

                if (newStatusID !== previousStatusID.current) {
                    previousStatusID.current = newStatusID;
                    setShowAvatar(false);
                    setSrc(`/api/sheet/player/avatar/${newStatusID}?playerID=${props.playerId}&v=${Date.now()}`);
                }

                return newAttrStatus;
            });
        });

        socket.on('infoChange', (playerId, infoId, value) => {
            if (playerId !== props.playerId || infoId !== props.playerName.info_id) return;
            setPlayerName(value);
        });

        function showDiceRoll() {
            if (showDiceRef.current) return;
            if (diceVideo.current) {
                setShowDice(true);
                diceVideo.current.currentTime = 0;
                diceVideo.current.play();
            }
        }

        async function hideDiceRoll() {
            setDiceResultShow(false);
            setDiceDescriptionShow(false);
            setShowDice(false);
            await sleep(600);
            setDiceResult(0);
            setDiceDescription('');
        }

        socket.on('diceRoll', showDiceRoll);

        async function showNextResult(playerId: number, dices: ResolvedDice[], results: DiceResult[]) {
            showDiceRoll();
            await sleep(1000);
            onDiceResult(playerId, dices, results);
        }

        async function onDiceResult(playerId: number, dices: ResolvedDice[], results: DiceResult[]) {
            if (playerId !== props.playerId || results.length === 0) return;

            const result = results[0];

            if (diceData.current) return diceQueue.current.push(result);
            if (!showDiceRef.current) return showNextResult(playerId, dices, results);

            diceData.current = result;
            setDiceResult(result.roll);
            setDiceResultShow(true);
            if (result.description) {
                await sleep(750);
                setDiceDescription(result.description);
                setDiceDescriptionShow(true);
            }
            await sleep(1500);
            await hideDiceRoll();
            diceData.current = undefined;

            const next = diceQueue.current.shift();
            if (next) showNextResult(playerId, dices, [next]);
        }

        socket.on('diceResult', onDiceResult);

        return () => {
            socket.off('environmentChange');
            socket.off('attributeChange');
            socket.off('attributeStatusChange');
            socket.off('infoChange');
            socket.off('diceRoll');
            socket.off('diceResult');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socket]);

    useEffect(() => {
        document.body.style.backgroundColor = 'transparent';
        document.body.style.color = 'black';
        const id = attributeStatus.find(stat => stat.value)?.value || 0;
        setSrc(`/api/sheet/player/avatar/${id}?playerID=${props.playerId}&v=${Date.now()}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (props.notFound) return <h1>Personagem não existe.</h1>;

    return (
        <>
            <div className={`${showDice ? 'show ' : ''}shadow`}>
                <Fade in={showAvatar}>
                    <div>
                        <Image src={src} onError={() => setSrc('/avatar404.png')}
                            alt='Avatar' onLoad={() => setShowAvatar(true)}
                            width={420} height={600} className={styles.avatar} />
                    </div>
                </Fade>
                {sideAttribute &&
                    <div className={`${styles.sideContainer} ${getOrientationStyle(props.orientation)}`}>
                        <div className={styles.side} style={getAttributeStyle(sideAttribute.Attribute.color)}>
                            {sideAttribute.value}
                        </div>
                    </div>
                }
            </div>
            <Fade in={environment === 'combat'}>
                <div className={`${styles.combat} ${getOrientationStyle(props.orientation)}`}>
                    {attributes.map(attr =>
                        <div className={styles.attribute} style={getAttributeStyle(attr.Attribute.color)}
                            key={attr.Attribute.id}>
                            {attr.value}/{attr.maxValue}
                        </div>
                    )}
                </div>
            </Fade>
            <Fade in={environment === 'idle'}>
                <div className={`${styles.nameContainer} ${getOrientationStyle(props.orientation)}`}>
                    {playerName || 'Desconhecido'}
                </div>
            </Fade>
            <div className={styles.diceContainer}>
                <video height={357} muted className={`popout${showDice ? ' show' : ''}`} ref={diceVideo}>
                    <source src="/dice_animation.webm" />
                </video>
                <Fade in={diceResultShow}><div className={styles.result}>{diceResult}</div></Fade>
                <Fade in={diceDescriptionShow}><div className={styles.description}>{diceDescription}</div></Fade>
            </div>
        </>
    );
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
    const player_id = parseInt(ctx.query.characterID as string);

    const portraitConfig = JSON.parse(
        (await prisma.config.findUnique({ where: { name: 'portrait' } }))?.value || 'null') as PortraitConfig;

    const results = await Promise.all([
        prisma.config.findUnique({ where: { name: 'environment' } }),
        prisma.player.findUnique({
            where: { id: player_id },
            select: {
                PlayerAttributes: {
                    where: { Attribute: { id: { in: [...portraitConfig.attributes, portraitConfig.side_attribute] } } },
                    select: { value: true, maxValue: true, Attribute: { select: { id: true, name: true, color: true } } }
                },
                PlayerAttributeStatus: {
                    select: { value: true, attribute_status_id: true }
                },
                PlayerInfo: {
                    where: { Info: { name: 'Nome' } },
                    select: { value: true, info_id: true }
                }
            }
        })
    ]);

    if (!results[1]) return {
        props: {
            playerId: player_id,
            orientation: portraitConfig.orientation || 'bottom',
            environment: 'idle' as Environment,
            attributes: [],
            attributeStatus: [],
            sideAttribute: null,
            playerName: { value: 'Desconhecido', info_id: 0 },
            notFound: true
        }
    };

    const sideAttributeIndex = results[1].PlayerAttributes.findIndex(attr => attr.Attribute.id === portraitConfig.side_attribute);

    let sideAttribute: { value: number, Attribute: { id: number, name: string, color: string } } | null = null;
    if (sideAttributeIndex > -1) sideAttribute = results[1].PlayerAttributes.splice(sideAttributeIndex, 1)[0];
    const attributes = results[1].PlayerAttributes;

    return {
        props: {
            playerId: player_id,
            orientation: portraitConfig.orientation || 'bottom',
            environment: (results[0]?.value || 'idle') as Environment,
            attributes,
            sideAttribute,
            attributeStatus: results[1].PlayerAttributeStatus,
            playerName: results[1].PlayerInfo[0]
        }
    };
}