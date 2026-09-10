const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { panel } = require('../../TicketControlSuite');
const data = new SlashCommandBuilder().setName('ticket').setDescription('Abre o gerenciador completo do sistema de tickets').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString());
module.exports={name:'ticket',description:'Abre o gerenciador completo do sistema de tickets',type:1,data,run:async(_client,interaction)=>{if(!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)&&!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))return interaction.reply({content:'❌ Você precisa de Gerenciar Servidor para abrir este painel.',ephemeral:true});return interaction.reply({...panel(),ephemeral:true});}};
